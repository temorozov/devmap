import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
  };
  let jwt: { sign: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };
    jwt = { sign: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: JwtService,
          useValue: jwt,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('updates handle when it was previously synced from the GitHub username', async () => {
    const existingUser = {
      id: 'u1',
      handle: 'temorozov',
      githubUsername: 'temorozov',
      name: 'Temorozov',
      email: 'old@example.com',
      isGuest: false,
    } as User;
    prisma.user.findFirst.mockResolvedValue(existingUser);
    prisma.user.update.mockResolvedValue({
      ...existingUser,
      handle: 'cdmorozov',
      githubUsername: 'cdmorozov',
    });

    await expect(
      service.validateGitHubUser({
        githubId: 'github-1',
        githubUsername: 'cdmorozov',
        githubAccessToken: 'token',
        email: 'old@example.com',
        name: 'Temorozov',
      }),
    ).resolves.toMatchObject({
      handle: 'cdmorozov',
      githubUsername: 'cdmorozov',
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({
          handle: 'cdmorozov',
          githubUsername: 'cdmorozov',
        }),
      }),
    );
  });

  it('keeps a custom handle when the GitHub username changes', async () => {
    const existingUser = {
      id: 'u2',
      handle: 'devmap-pro',
      githubUsername: 'temorozov',
      name: 'Temorozov',
      email: 'custom@example.com',
      isGuest: false,
    } as User;
    prisma.user.findFirst.mockResolvedValue(existingUser);
    prisma.user.update.mockResolvedValue({
      ...existingUser,
      githubUsername: 'cdmorozov',
    });

    await expect(
      service.validateGitHubUser({
        githubId: 'github-2',
        githubUsername: 'cdmorozov',
        githubAccessToken: 'token',
        email: 'custom@example.com',
        name: 'Temorozov',
      }),
    ).resolves.toMatchObject({
      handle: 'devmap-pro',
      githubUsername: 'cdmorozov',
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u2' },
        data: expect.objectContaining({
          handle: 'devmap-pro',
          githubUsername: 'cdmorozov',
        }),
      }),
    );
  });
});
