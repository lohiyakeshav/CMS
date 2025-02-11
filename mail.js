const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'keshavlohiyabusiness@gmail.com', // Replace with your email
    pass: 'ltpe qqxn navu iddw' // Replace with your email password or app password
  }
});

// Function to send an email
const sendEmail = (email, subject, templateName, replacements) => {
  console.log('Preparing to send email to:', email);
  console.log('Template:', templateName);
  console.log('Replacements:', replacements);

  // Read the HTML template file
  const templatePath = path.join(__dirname, 'templates', `${templateName}.html`);
  fs.readFile(templatePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading email template:', err);
      return;
    }

    // Replace placeholders with actual values
    let customizedTemplate = data;
    for (const [key, value] of Object.entries(replacements)) {
      customizedTemplate = customizedTemplate.replace(`{{${key}}}`, value);
    }

    // Customize the email content
    const mailOptions = {
      from: 'keshavlohiyabusiness@gmail.com', // Replace with your email
      to: email,
      subject: subject,
      html: customizedTemplate
    };

    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });
  });
};

module.exports = { sendEmail }; 