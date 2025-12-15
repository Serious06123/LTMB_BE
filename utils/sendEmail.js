// ltmb_be/utils/sendEmail.js
import nodemailer from 'nodemailer';

const sendEmail = async (email, otp) => {
  // Cấu hình SMTP (Ví dụ dùng Gmail - Bạn nên dùng App Password nếu dùng Gmail)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.user, // Thay bằng email của bạn
      pass: process.env.pass,    // Thay bằng mật khẩu ứng dụng
    },
  });

  const mailOptions = {
    from: '"LTMB Food App" <no-reply@ltmb.com>',
    to: email,
    subject: 'Mã xác thực đăng ký (OTP)',
    html: `
      <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
        <div style="margin:50px auto;width:70%;padding:20px 0">
          <div style="border-bottom:1px solid #eee">
            <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">LTMB Food</a>
          </div>
          <p style="font-size:1.1em">Xin chào,</p>
          <p>Cảm ơn bạn đã đăng ký tài khoản. Vui lòng sử dụng mã OTP sau để hoàn tất quá trình xác thực. Mã này có hiệu lực trong 5 phút.</p>
          <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">${otp}</h2>
          <p style="font-size:0.9em;">Trân trọng,<br />Đội ngũ LTMB</p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export default sendEmail;