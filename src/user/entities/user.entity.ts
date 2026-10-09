import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { ToDo } from '../../to-do/entities/to-do.entity';
import { Category } from '../../category/entities/category.entity';
import { UserRole } from '../enums/user-role.enum';

@Entity('user')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 30 })
    name: string;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 255 })
    email: string;

    @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
    role: UserRole;

    @Column({ type: 'varchar', length: 255, select: false })
    password: string;

    // Only the Cloudinary URL is stored here, never the file itself.
    // Nullable: a user who never uploaded an avatar has no image.
    @Column({ type: 'varchar', length: 255, nullable: true })
    avatarUrl: string | null;

    // One-time forgot-password code, shown only when explicitly selected.
    @Column({ type: 'varchar', length: 6, nullable: true, select: false })
    resetCode: string | null;

    @Column({ type: 'timestamptz', nullable: true, select: false })
    resetCodeExpiresAt: Date | null;

    @OneToMany(() => ToDo, (todo) => todo.user)
    todos: ToDo[];

    @OneToMany(() => Category, (category) => category.user)
    categories: Category[];

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}
