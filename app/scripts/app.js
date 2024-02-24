var client;

init();

async function init() {
   client = await app.initialized();
}

const ghubAccessToken = '<<GitHub-Access-Token>>'; // Replace with your GitHub access token
const repoOwner = '<<Repo-Owner-Name>>'; // Replace with the owner of the repository
const repoName = '<<Repo-Name>>'; // Replace with the name of the repository
const domain = "<<Domain-Name-FreshDesk>>";
const apiKey = "<<API-KEY-FreshDesk>>"; //FreshDesk API Key
const closedIssuesURL = `https://api.github.com/repos/${repoOwner}/${repoName}/issues?state=closed`;


function searchIssueForFreshdeskTicket(issues, ticketId) {
   for (const issue of issues) {
      console.log(issue.body);
      const freshdeskTicketId = getFreshdeskTicketId(issue.body);
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
   closeTicket(contactData.ticket.id);
   getIssues()
      .then(data => {
         if (searchIssueForFreshdeskTicket(data, contactData.ticket.id) === 0) {
            createIssue(contactData.ticket.subject, contactData.ticket.description, contactData.ticket.id, label);
         } else if (contactData.ticket.status_label === "Closed") {
            closeIssuesWithTicketId(data, contactData.ticket.id)

         }

      })
      .catch(error => {
         console.error('Error fetching issues:', error);
      });


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

   // Include Freshdesk ticket ID in GitHub issue body
   body += `\n\nFreshdesk Ticket ID: ${freshdeskTicketId}`;

   const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues`, {
      method: 'POST',
      headers: {
         'Authorization': `Bearer ${ghubAccessToken}`,
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

async function closeIssuesWithTicketId(issues, ticketId) {

   for (const issue of issues) {
      const freshdeskTicketId = getFreshdeskTicketId(issue.body);

      if (freshdeskTicketId && parseInt(freshdeskTicketId) === ticketId) {
         // Close the issue
         const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issue.number}`, {
            method: 'PATCH',
            headers: {
               'Authorization': `Bearer ${ghubAccessToken}`,
               'Content-Type': 'application/json'
            },
            body: JSON.stringify({
               state: 'closed'
            })
         });

         if (response.ok) {
            console.log(`Issue ${issue.number} closed successfully.`);
         } else {
            console.error(`Failed to close issue ${issue.number}:`, response.statusText);
         }
      }
   }
}

function getFreshdeskTicketId(issueBody) {
   // Regular expression pattern to match Freshdesk ticket IDs
   const regex = /Freshdesk Ticket ID: (\d+)/;
   const match = issueBody.match(regex);
   return match && match.length > 1 ? match[1] : null; // Return null if no ticket ID is found
}

async function closeFreshdeskTicket(ticketId) {
   const closeURL = `https://${domain}.freshdesk.com/api/v2/tickets/${ticketId}`;

   const response = await fetch(closeURL, {
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

   if (response.ok) {
      console.log(`Ticket ${ticketId} closed successfully.`);
   } else {
      console.error(`Failed to close ticket ${ticketId}:`, response.statusText);
   }
}


async function closeTicket(ticketId) {

   const response = await fetch(closedIssuesURL, {
      headers: {
         'Authorization': `Bearer ${ghubAccessToken}`,
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
   const conversationsURL = `https://${domain}.freshdesk.com/api/v2/tickets/${ticketId}?include=conversations`;
   const response = await fetch(conversationsURL, {
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
