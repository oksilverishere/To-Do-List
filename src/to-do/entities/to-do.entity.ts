import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Category } from '../../category/entities/category.entity';
import { TodoPriority, TodoStatus } from '../enums';

@Entity('todo')
export class ToDo {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100 })
    title: string;

    @Column({ type: 'varchar', length: 500 })
    bio: string;

    @Index()
    @Column({
        type: 'enum',
        enum: TodoStatus,
        enumName: 'todo_status',
        default: TodoStatus.PENDING,
    })
    status: TodoStatus;

    @Index()
    @Column({
        type: 'enum',
        enum: TodoPriority,
        enumName: 'todo_priority',
        default: TodoPriority.MEDIUM,
    })
    priority: TodoPriority;

    @Index()
    @Column({ type: 'uuid' })
    userId: string;

    @ManyToOne(() => User, (user) => user.todos, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Index()
    @Column({ type: 'uuid', nullable: true })
    categoryId: string | null;

    @ManyToOne(() => Category, (category) => category.todos, {
        // Deleting a category takes every to-do inside it with it.
        onDelete: 'CASCADE',
        nullable: true,
    })
    @JoinColumn({ name: 'categoryId' })
    category: Category | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}
