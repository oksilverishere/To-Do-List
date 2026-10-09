import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { TodoStatus } from '../enums';

export class ChangeStatusDto {
    @ApiProperty({
        description: 'New status of the task',
        enum: TodoStatus,
        example: TodoStatus.DONE,
    })
    @IsNotEmpty({ message: 'status is required' })
    @IsEnum(TodoStatus, {
        message: `status must be one of: ${Object.values(TodoStatus).join(', ')}`,
    })
    status: TodoStatus;
}

export class ChangeStatusResponseDto {
    @ApiProperty({ example: 'todo status changed successfully' })
    message: string;

    @ApiProperty({ enum: TodoStatus, example: TodoStatus.DONE })
    status: TodoStatus;
}
