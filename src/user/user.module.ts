import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { CloudinaryService } from './cloudinary.service';
import { EmailService } from './email.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';

@Module({
  controllers: [UserController],
  providers: [UserService, CloudinaryService, EmailService],
  imports: [TypeOrmModule.forFeature([User])]
})
export class UserModule { }
