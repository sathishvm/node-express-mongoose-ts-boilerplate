import * as nodemailer from 'nodemailer';
import pug from 'pug';
import * as htmlToText from 'html-to-text';
import { config } from '../config/config';

export class Email {
  to: string;
  firstName: string;
  url: string;
  from: string;

  constructor(user: any, url: string) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Sathish Bublu <${config.email.from}>`;
  }

  newTransport() {
    if (config.env === 'production') {
      // Sendgrid
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: config.email.smtp.auth.user,
          pass: config.email.smtp.auth.pass,
        },
      });
    }

    return nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      auth: {
        user: config.email.smtp.auth.user,
        pass: config.email.smtp.auth.pass,
      },
    });
  }

  async send(template: string, subject: string) {
    // 1) Render the email template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.fromString(html),
    };

    // 3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the our new Family!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)'
    );
  }
}
