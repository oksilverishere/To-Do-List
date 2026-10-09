import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user/entities/user.entity';
import { Category } from './category/entities/category.entity';
import { ToDo } from './to-do/entities/to-do.entity';
import { UserRole } from './user/enums/user-role.enum';

const ADMIN_EMAIL = 'ahm5dn5hh5s@gmail.com';
const ADMIN_PASSWORD = 'admin@12211221';

async function run() {
    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl:
            process.env.DB_SSL === 'true'
                ? { rejectUnauthorized: false }
                : false,
        entities: [User, Category, ToDo],
        synchronize: true,
    });

    await dataSource.initialize();

    try {
        const users = dataSource.getRepository(User);
        const existing = await users.findOne({ where: { email: ADMIN_EMAIL } });

        if (existing) {
            let changed = false;

            if (existing.role !== UserRole.SUPER_ADMIN) {
                existing.role = UserRole.SUPER_ADMIN;
                changed = true;
            }

            if (existing.name !== 'S_I_L_V_E_R') {
                existing.name = 'S_I_L_V_E_R';
                changed = true;
            }

            if (changed) {
                await users.save(existing);
                console.log('superAdmin updated');
            } else {
                console.log('admin already exists, nothing to do');
            }
            return;
        }

        const admin = users.create({
            name: 'S_I_L_V_E_R',
            email: ADMIN_EMAIL,
            password: await bcrypt.hash(ADMIN_PASSWORD, 10),
            role: UserRole.SUPER_ADMIN,
        });

        await users.save(admin);
        console.log('admin seeded:', ADMIN_EMAIL);
    } finally {
        await dataSource.destroy();
    }
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
