import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { UserModule } from './user/user.module';
import { ToDoModule } from './to-do/to-do.module';
import { CategoryModule } from './category/category.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';

const REQUIRED_ENV_VARS = [
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_NAME',
  // Without this, sign-in would have to fall back to a hardcoded secret,
  // which means anyone can mint valid tokens.
  'JWT_SECRET',
  // Cloudinary URL, used by PATCH /user/profile to store profile images.
  'CLOUDINARY_URL',
  // SMTP credentials, used to email the forgot-password reset code.
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
] as const;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config: Record<string, unknown>) => {
        const missing = REQUIRED_ENV_VARS.filter(
          (key) => config[key] === undefined || config[key] === '',
        );

        if (missing.length > 0) {
          throw new Error(
            `Missing required environment variables: ${missing.join(', ')}. ` +
              'Copy .env.example to .env and fill in the values.',
          );
        }

        return config;
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        // env vars always arrive as strings, so coerce before handing to TypeORM
        port: Number(configService.get<string>('DB_PORT')),
        username: configService.get<string>('DB_USERNAME'),
        password: String(configService.get('DB_PASSWORD')),
        database: configService.get<string>('DB_NAME'),
        // Neon (and most hosted Postgres) requires TLS; the cert chain is
        // verified by the driver, so plain `ssl: true` is enough.
        ssl:
          configService.get<string>('DB_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // getOrThrow, not get: JWT_SECRET is in REQUIRED_ENV_VARS, so this
        // narrows the type to string as well as failing loudly.
        const expiresIn =
          configService.get<string>('JWT_EXPIRES_IN') ?? '1h';

        return {
          secret: configService.getOrThrow<string>('JWT_SECRET'),
          signOptions: {
            // jsonwebtoken types this as the `ms` StringValue template type;
            // the string is validated by the library at signing time.
            expiresIn: expiresIn as JwtSignOptions['expiresIn'],
          },
        };
      },
    }),
    UserModule,
    ToDoModule,
    CategoryModule,
    DashboardModule,
    // Registers JwtAuthGuard globally, so it must be imported after the
    // JwtModule.registerAsync above.
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger('Database');

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    if (this.dataSource.isInitialized) {
      this.logger.log('Successfully Connected To The DataBase!');
    } else {
      this.logger.error('Failed To Connect To The DataBase!');
    }
  }
}
