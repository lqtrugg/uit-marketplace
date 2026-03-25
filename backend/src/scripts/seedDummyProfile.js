import 'dotenv/config';
import { getDataSource } from '../core/dataSource.js';
import { UserEntity } from '../entities/UserEntity.js';

async function main() {
  const dataSource = await getDataSource();
  const userRepo = dataSource.getRepository(UserEntity);

  const googleId = String(process.env.DUMMY_PROFILE_GOOGLE_ID || 'dummy-chat-profile-001').trim();
  const email = String(process.env.DUMMY_PROFILE_EMAIL || 'dummy.chat.001@gm.uit.edu.vn').trim().toLowerCase();
  const name = String(process.env.DUMMY_PROFILE_NAME || 'Dummy Chat Tester').trim();
  const picture = String(
    process.env.DUMMY_PROFILE_PICTURE ||
      'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=240&q=80'
  ).trim();

  if (!googleId || !email || !name) {
    throw new Error('Dummy profile values are invalid.');
  }

  const existingByGoogleId = await userRepo.findOneBy({ googleId });
  const existingByEmail = await userRepo.findOneBy({ email });
  const existing = existingByGoogleId || existingByEmail || null;

  if (existing) {
    existing.googleId = googleId;
    existing.email = email;
    existing.name = name;
    existing.picture = picture;
    existing.lastLoginAt = new Date();
    const saved = await userRepo.save(existing);
    console.log('[DUMMY_PROFILE_UPSERTED]', saved.googleId, saved.email);
  } else {
    const created = userRepo.create({
      googleId,
      email,
      name,
      picture,
      lastLoginAt: new Date()
    });
    const saved = await userRepo.save(created);
    console.log('[DUMMY_PROFILE_CREATED]', saved.googleId, saved.email);
  }

  await dataSource.destroy();
}

main().catch((error) => {
  console.error('[DUMMY_PROFILE_SEED_ERROR]', error);
  process.exit(1);
});
