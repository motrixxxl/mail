let current_page = 'inbox';
let current_btn = false;

document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  document.querySelector('#compose-form').addEventListener('submit', (e) => send(e));

  // By default, load the inbox
  load_mailbox('inbox');
});


function compose_email() {

  // Show compose view and hide other views
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';
}


function load_mailbox(mailbox)
{
  current_page = mailbox;  
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'none';

  // Clear error
  document.querySelector('#compose-error').innerText = '';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  fetch(`/emails/${mailbox}`)
  .then(response => response.json())
  .then(emails => {
      let ul = document.createElement('ul');
      ul.className = 'mail-list';
      emails.forEach(function (element) {
        ul.append(add_mail(element));
      });
      document.querySelector('#emails-view').append(ul);
  })
  .catch((error) => {
    console.error('Error:', error);
  });
}


function add_mail(data)
{
  let li = document.createElement('li');
  li.className = 'mail-row mail-item';
  li.dataset.id = data.id;
  li.addEventListener('click', (e) => open_mail(e, data.id));
  if (!data.read) {
    li.className += ' unread';
  }
  addDivElement(li, data.sender);
  addDivElement(li, data.subject);
  addDivElement(li, data.timestamp);
  switch (current_page) {
    case 'inbox':
      addButton(li, '<div data-archive="1">archive</div>');
      addButton(li, getMarkLabel(data.read));
      break;
    case 'archive':
      addButton(li, '<div data-archive="0">unarchive</div>');
      addButton(li, getMarkLabel(data.read));
      break;
    case 'sent':
      addButton(li, getMarkLabel(data.read));
      break;
    default:
      break;
  }

  return li;
}


function getMarkLabel(state)
{
  if (state) {
    return '<div data-read="0">mark unread</div>';
  } else {
    return '<div data-read="1">mark read</div>';
  }
}


function addDivElement(parent, data)
{
  const div = document.createElement('div');
  div.innerText = data;
  div.className = 'mail-cell';
  parent.append(div);
}


function addButton(parent, html)
{
  const div = document.createElement('div');
  div.innerHTML = html;
  div.className += ' mail-cell';
  parent.append(div);
  div.addEventListener('click', function (e) {
    const el = e.target;
    if (el.dataset.archive != undefined) {
      current_page = 'inbox';
      archive(parent.dataset.id, el.dataset.archive == 1, 'load_mailbox');
    }
    if (el.dataset.read != undefined) {
      read(parent.dataset.id, el.dataset.read == 1, 'load_mailbox');
    }
  });
}


function open_mail(e, id)
{
  if (e.target.dataset.archive != undefined || e.target.dataset.read != undefined) {
    return true;
  }

  fetch(`/emails/${id}`)
  .then(response => response.json())
  .then(email => {
    document.querySelector('#emails-view').style.display = 'none';
    document.querySelector('#compose-view').style.display = 'none';
    document.querySelector('#email-view').style.display = 'block';
    document.querySelector('#email-view').innerHTML =
      `<div class="text-from"><label>From:</label> ${email.sender}</div>`+
      `<div class="text-to"><label>To:</label ${email.recipients}</div>`+
      `<div class="text-subject"><label>Subject:</label> ${email.subject}</div>`+
      `<div class="text-timestamp"><label>Created:</label> ${email.timestamp}</div>`;

    const btn = document.createElement('button');
    btn.id = 'answer';
    btn.innerText = 'Відповісти';
    btn.className = 'btn btn-sm btn-outline-primary';
    document.querySelector('#email-view').append(btn);
    btn.addEventListener('click', () => answer(email));

    document.querySelector('#email-view').append(document.createElement('hr'));
    const dd = document.createElement('div');
    dd.className = 'text-body';
    dd.innerText = email.body;
    document.querySelector('#email-view').append(dd);

    read(id, true);
  })
  .catch((error) => {
    console.error('Error:', error);
  });

  return true;
}


function answer(email)
{
  compose_email();
  document.querySelector('#compose-recipients').value = email.sender;
  document.querySelector('#compose-subject').value = 'Re: '+email.subject;
  document.querySelector('#compose-body').value =
    `On ${email.timestamp} ${email.recipients} написав:\n` + email.body + `\n\n`;
  document.querySelector('#compose-body').focus();
}


function read(id, value, func)
{
  put_request('read', id, value, func);
}


function archive(id, value, func)
{
  put_request('archived', id, value, func);
}


function put_request(property, id, value, func=false)
{
  data = new Object;
  data[property] = value;
  fetch(
    `/emails/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
  .then(response => {
    if (func) {
      window[func](current_page);
    }
  })
  .catch((error) => {
    console.error('Error:', error);
  });
}


function send(e)
{
  e.preventDefault();
  let data = {
    recipients: document.querySelector('#compose-recipients').value,
    subject: document.querySelector('#compose-subject').value,
    body: document.querySelector('#compose-body').value
  };
  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(emails => {
      console.log(emails);
      if (emails.error != undefined) {
        document.querySelector('#compose-error').innerText  = emails.error;
      }
      if (emails.message != undefined) {
        load_mailbox('sent');
        alert(emails.message);
      }
  })
  .catch((error) => {
    console.error('Error:', error);
  });
}