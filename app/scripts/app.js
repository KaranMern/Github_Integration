var client;

init();

async function init() {
   client = await app.initialized();
}


function searchIssueForFreshdeskTicket(issues, ticketId) {
   // Iterate through each issue
   for (const issue of issues) {
      // Extract Freshdesk ticket ID from the body of the issue
      //console.log(issue.body);
      const freshdeskTicketId = getFreshdeskTicketId(issue.body);
      // If a Freshdesk ticket ID is found and it matches the passed ticket ID, return 1
      if (freshdeskTicketId && parseInt(freshdeskTicketId) === ticketId) {

         return 1;
      }
   }

   // If no match is found, return 0
   return 0;
}


async function applyChanges() {
   const contactData = await client.data.get('ticket');
   const label_dict = {
      "Problem": "bug",
      "Feature Request": "enhancement",
      "Question": "question",
      "Incident": "help wanted",
      "Refund": "help wanted"
   };
   const label = label_dict[contactData.ticket.type];
   console.log(contactData.ticket.status_label);
   if (contactData.ticket.status_label === "Open" ){
       closeTicket(contactData.ticket.id);
   }
   else{
    getIssues()
      .then(data => {
         if (searchIssueForFreshdeskTicket(data, contactData.ticket.id) === 0) {
            createIssue(contactData.ticket.subject, contactData.ticket.description, contactData.ticket.id, label);
         } else if (contactData.ticket.status_label === "Closed") {
            openOrCloseIssueWithTicketId(data, contactData.ticket.id, "closed");
         }
         else if (contactData.ticket.status_label === "Open") {
            openOrCloseIssueWithTicketId(data, contactData.ticket.id, "open");
         }

      })
      .catch(error => {
         console.error('Error fetching issues:', error);
      });

   }   //getTicketConversations(contactData.ticket.id);

}


async function logIssues() {
   fetch('https://api.github.com/repos/KaranMern/Issues/issues')
      .then(resp => resp.json())
      .then(data => console.log(data));
}

async function getIssues() {
   return fetch('https://api.github.com/repos/KaranMern/Issues/issues')
      .then(resp => resp.json());
}


async function createIssue(title, body, freshdeskTicketId, label) {
   const accessToken = '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'; // Replace with your GitHub access token
   const repositoryOwner = 'KaranMern'; // Replace with the owner of the repository
   const repositoryName = 'Issues'; // Replace with the name of the repository

   // Include Freshdesk ticket ID in GitHub issue body
   body += `\n\nFreshdesk Ticket ID: ${freshdeskTicketId}`;

   const response = await fetch(`https://api.github.com/repos/${repositoryOwner}/${repositoryName}/issues`, {
      method: 'POST',
      headers: {
         'Authorization': `Bearer ${accessToken}`,
         'Content-Type': 'application/json'
      },
      body: JSON.stringify({
         title: title,
         body: body,
         labels: [label]
      })
   });

   if (response.ok) {
      const data = await response.json();
      console.log('Issue created successfully:', data);
   } else {
      console.error('Failed to create issue:', response.statusText);
   }
}

async function openOrCloseIssueWithTicketId(issues, ticketId, state) {
   const accessToken = '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'; // Replace with your GitHub access token
   const repositoryOwner = 'KaranMern'; // Replace with the owner of the repository
   const repositoryName = 'Issues'; // Replace with the name of the repository

   for (const issue of issues) {
      const freshdeskTicketId = getFreshdeskTicketId(issue.body);

      if (freshdeskTicketId && parseInt(freshdeskTicketId) === ticketId) {
         // Close the issue
         const response = await fetch(`https://api.github.com/repos/${repositoryOwner}/${repositoryName}/issues/${issue.number}`, {
            method: 'PATCH',
            headers: {
               'Authorization': `Bearer ${accessToken}`,
               'Content-Type': 'application/json'
            },
            body: JSON.stringify({
               state: state
            })
         });

         if (response.ok) {
            console.log(`Issue ${issue.number} ${state} successfully.`);
         } else {
            console.error(`Failed to close issue ${issue.number}:`, response.statusText);
         }
      }
   }
}

function getFreshdeskTicketId(issueBody) {
   // Regular expression pattern to match Freshdesk ticket IDs
   const regex = /Freshdesk Ticket ID: (\d+)/; //d+ means one or more digits
   const match = issueBody.match(regex);
   return match && match.length > 1 ? match[1] : null; // Return null if no ticket ID is found
}

async function closeFreshdeskTicket(ticketId) {

   const domain = "ksolutions";
   const apiKey = "4vuN2JgVpyew1WpnMgJ";
   const url = `https://${domain}.freshdesk.com/api/v2/tickets/${ticketId}`;
   const response = await fetch(url, {
      method: 'PUT',
      headers: {
         'Authorization': `Basic ${btoa(apiKey + ":")}`, // Encoding API key for Basic Auth
         'Content-Type': 'application/json'
      },
      body: JSON.stringify({
         priority: 2,
         status: 5
      })
   });
   console.log("In close");
   if (response.ok) {
      console.log(`Ticket ${ticketId} closed successfully.`);
   } else {
      console.error(`Failed to close ticket ${ticketId}:`, response.statusText);
   }
}

async function closeTicket(ticketId) {

   const accessToken = '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'; // Replace with your GitHub access token
   const repoOwner = 'KaranMern'; // Replace with the owner of the repository
   const repoName = 'Issues';
   const url = `https://api.github.com/repos/${repoOwner}/${repoName}/issues?state=closed`;

   const response = await fetch(url, {
      headers: {
         'Authorization': `Bearer ${accessToken}`,
         'Content-Type': 'application/json'
      }
   });

   if (response.ok) {
      const data = await response.json();
      if (searchIssueForFreshdeskTicket(data, ticketId) === 1) {
         closeFreshdeskTicket(ticketId);
      }
   } else {
      throw new Error(`Failed to fetch closed issues: ${response.statusText}`);
   }
}



async function getTicketConversations(ticketId) {
   const domain = "ksolutions";
   const apiKey = "4vuN2JgVpyew1WpnMgJ";
   const url = `https://${domain}.freshdesk.com/api/v2/tickets/${ticketId}?include=conversations`;

   const response = await fetch(url, {
      method: 'GET',
      headers: {
         'Authorization': `Basic ${btoa(apiKey + ":")}` // Encoding API key for Basic Auth
      }
   });

   if (response.ok) {
      const data = await response.json();
      data.conversations.forEach(con => {
         console.log(con.body_text);
      })
   } else {
      throw new Error(`Failed to fetch ticket conversations: ${response.statusText}`);
   }
}
