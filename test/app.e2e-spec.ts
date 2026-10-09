import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { AppModule } from './../src/app.module';
import { Category } from './../src/category/entities/category.entity';
import { User } from './../src/user/entities/user.entity';
import { ACCESS_TOKEN_COOKIE, NOT_ALLOWED_MESSAGE } from './../src/auth/auth.constants';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  let jwtService: JwtService;
  let categoryRepository: Repository<Category>;

  // Real rows, because category.userId has a foreign key to user. Signing up
  // for real also keeps the auth path exercised rather than mocked.
  let userId: string;
  let otherUserId: string;

  const tokenFor = (id: string) =>
    jwtService.sign({ sub: id, email: 'e2e@x.com' });

  const signUp = async (email: string) => {
    const response = await request(app.getHttpServer())
      .post('/user/sign-up')
      .send({
        name: `e2e${Math.random().toString(36).slice(2, 8)}`,
        email,
        password: 'password123',
      })
      .expect(201);

    return response.body.id as string;
  };

  beforeEach(async () => {
    // Each test starts from an empty category table. A query builder rather
    // than `clear`, because category is referenced by a foreign key from to_do
    // so TRUNCATE is refused, and `delete({})` is rejected as empty criteria.
    await categoryRepository.createQueryBuilder().delete().execute();
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Mirrors main.ts, otherwise the DTO rules are not applied and every
    // payload would be accepted.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    // Mirrors main.ts: JwtAuthGuard reads request.cookies.access_token.
    app.use(cookieParser());
    await app.init();

    jwtService = app.get<JwtService>(JwtService);
    categoryRepository = app.get<Repository<Category>>(
      getRepositoryToken(Category),
    );

    userId = await signUp(`e2e_${Date.now()}@example.com`);
    otherUserId = await signUp(`e2e_other_${Date.now()}@example.com`);
  });

  // Only sign-up and sign-in are exposed now.
  it('/user (GET) should be gone', () => {
    return request(app.getHttpServer()).get('/user').expect(404);
  });

  it('/to-do (GET) should be gone', () => {
    return request(app.getHttpServer()).get('/to-do').expect(404);
  });

  it('/category (GET) should be gone', () => {
    return request(app.getHttpServer()).get('/category').expect(404);
  });

  it('/category/newCategory (GET) should be gone', () => {
    return request(app.getHttpServer()).get('/category/newCategory').expect(404);
  });

  describe('POST /category/newCategory', () => {
    const body = {
      title: 'programming',
      bio: 'this category for programming learnings',
    };

    it('is blocked when no token is supplied', async () => {
      const response = await request(app.getHttpServer())
        .post('/category/newCategory')
        .send(body)
        .expect(401);

      expect(response.body.message).toBe(NOT_ALLOWED_MESSAGE);
    });

    it('is blocked when the token is garbage', async () => {
      const response = await request(app.getHttpServer())
        .post('/category/newCategory')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE}=not-a-real-token`)
        .send(body)
        .expect(401);

      expect(response.body.message).toBe(NOT_ALLOWED_MESSAGE);
    });

    it('rejects a body with no bio', async () => {
      // With a syntactically valid token the request reaches validation.
      const response = await request(app.getHttpServer())
        .post('/category/newCategory')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE}=${await tokenFor(userId)}`)
        .send({ title: 'programming' })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining(['bio is required']),
      );
    });

    it('rejects a spoofed userId in the body', async () => {
      await request(app.getHttpServer())
        .post('/category/newCategory')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE}=${await tokenFor(userId)}`)
        .send({ ...body, userId: otherUserId })
        // forbidNonWhitelisted rejects the unknown field outright, so the
        // route cannot be used to write into another account.
        .expect(400);

      const saved = await categoryRepository.findOne({
        where: { title: body.title },
      });
      expect(saved).toBeNull();
    });

    it('rejects a duplicate title for the same user', async () => {
      const token = await tokenFor(userId);

      await request(app.getHttpServer())
        .post('/category/newCategory')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE}=${token}`)
        .send(body)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/category/newCategory')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE}=${token}`)
        .send(body)
        .expect(400);

      expect(response.body.message).toBe(
        'This category title has been already exists!',
      );
    });

    it('allows the same title for a different user', async () => {
      await request(app.getHttpServer())
        .post('/category/newCategory')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE}=${await tokenFor(userId)}`)
        .send(body)
        .expect(201);

      // The unique constraint is on (userId, title), not title alone.
      await request(app.getHttpServer())
        .post('/category/newCategory')
        .set('Cookie', `${ACCESS_TOKEN_COOKIE}=${await tokenFor(otherUserId)}`)
        .send(body)
        .expect(201);
    });
  });

  it('/user/sign-in rejects an incomplete payload', () => {
    return request(app.getHttpServer())
      .post('/user/sign-in')
      .send({ email: 'ahm5dn5hh5s@gmail.com' })
      .expect(400);
  });

  afterAll(async () => {
    // Leave no test rows behind in the developer's database.
    await categoryRepository.createQueryBuilder().delete().execute();
    const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
    await userRepository.createQueryBuilder().delete().execute();

    await app.close();
  });
});