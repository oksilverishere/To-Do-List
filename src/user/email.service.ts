import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transporter, createTransport } from 'nodemailer';

/**
 * Sends mail over SMTP. Credentials come from `SMTP_*` vars in `.env`;
 * missing values are caught at boot by the REQUIRED_ENV_VARS check in
 * app.module.ts. Mail is always sent from the SMTP account itself.
 */
@Injectable()
export class EmailService {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(configService: ConfigService) {
    this.from = configService.getOrThrow<string>('SMTP_USER');

    this.transporter = createTransport({
      host: configService.getOrThrow<string>('SMTP_HOST'),
      port: Number(configService.getOrThrow<string>('SMTP_PORT')),
      // 465 is implicit TLS; 587 upgrades with STARTTLS on its own.
      secure: Number(configService.getOrThrow<string>('SMTP_PORT')) === 465,
      auth: {
        user: this.from,
        pass: configService.getOrThrow<string>('SMTP_PASS'),
      },
    });
  }

  /** Sends a 6-digit reset code to the given address. */
  async sendResetCode(to: string, code: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Password reset code',
      text:
        `Your password reset code is: ${code}\n` +
        'It expires in 10 minutes and can be used once.',
    });
  }
}
