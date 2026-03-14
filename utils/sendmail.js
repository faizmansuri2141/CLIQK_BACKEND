const nodemailer = require("nodemailer");
// for forget password
const sendEmail = async (email, subject, text) => {
    try {
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            service: process.env.SERVICE,
            port: 587,
            secure: false,
            auth: {
                user: "cliqk.social@gmail.com",
                pass: "fibjriaqsgjfxlyb",
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        await transporter.sendMail({
            from: "cliqk.social@gmail.com",
            to: email,
            subject: subject,
            text: text
        });
        console.log('log is >>>>', transporter);

        console.log("email sent sucessfully")
    } catch (error) {
        console.log(error, "email not sent");
    }
};

module.exports = sendEmail;