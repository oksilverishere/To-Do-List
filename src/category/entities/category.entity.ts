import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { ToDo } from '../../to-do/entities/to-do.entity';

@Index('IDX_category_user_title', ['userId', 'title'], { unique: true })
@Entity('category')
export class Category {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 50 })
    title: string;

    @Column({ type: 'varchar', length: 500 })
    bio: string;

    // A title is unique per user, not globally: two users may each have a
    // "programming" category. Enforced by IDX_category_user_title above.
    @Index()
    @Column({ type: 'uuid' })
    userId: string;

    @ManyToOne(() => User, (user) => user.categories, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @OneToMany(() => ToDo, (todo) => todo.category)
    todos: ToDo[];

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}
