import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import adminPinsRoutes from './admin-pins.routes.js';
import usersRoutes from './users.routes.js';
import vaultRoutes from './vault.routes.js';
import adminLecturersRoutes from './admin-lecturers.routes.js';
import adminVaultAssignmentsRoutes from './admin-vault-assignments.routes.js';
import walletRoutes from './wallet.routes.js';
import adminWalletRoutes from './admin-wallet.routes.js';
import marketplaceRoutes from './marketplace.routes.js';
import adminMarketplaceRoutes from './admin-marketplace.routes.js';
import eventsRoutes from './events.routes.js';
import adminEventsRoutes from './admin-events.routes.js';
import cmsRoutes from './cms.routes.js';
import blogRoutes, { adminBlogRoutes } from './blog.routes.js';
import newsRoutes, { adminNewsRoutes } from './news.routes.js';
import galleryRoutes, { adminGalleryRoutes } from './gallery.routes.js';
import facultyRoutes, { adminFacultyRoutes } from './faculty.routes.js';
import announcementsRoutes, {
  memberAnnouncementsRoutes,
  adminAnnouncementsRoutes,
} from './announcements.routes.js';
import subscribeRoutes, { adminSubscribeRoutes } from './subscribe.routes.js';
import contactRoutes from './contact.routes.js';
import notificationsRoutes from './notifications.routes.js';
import messagesRoutes from './messages.routes.js';
import adminRoutes from './admin.routes.js';
import yearbookRoutes from './yearbook.routes.js';
import adminYearbookRoutes from './admin-yearbook.routes.js';
import careersRoutes from './careers.routes.js';
import adminCareersRoutes from './admin-careers.routes.js';
import electionsRoutes from './elections.routes.js';
import adminElectionsRoutes from './admin-elections.routes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/admin/pins', adminPinsRoutes);
apiRouter.use('/users', usersRoutes);

apiRouter.use('/vault', vaultRoutes);
apiRouter.use('/admin/lecturers', adminLecturersRoutes);
apiRouter.use('/admin/vault', adminVaultAssignmentsRoutes);

apiRouter.use('/wallet', walletRoutes);
apiRouter.use('/admin/wallet', adminWalletRoutes);

apiRouter.use('/marketplace', marketplaceRoutes);
apiRouter.use('/admin/marketplace', adminMarketplaceRoutes);

apiRouter.use('/events', eventsRoutes);
apiRouter.use('/admin/events', adminEventsRoutes);

apiRouter.use('/cms', cmsRoutes);
apiRouter.use('/blog', blogRoutes);
apiRouter.use('/admin/blog', adminBlogRoutes);
apiRouter.use('/news', newsRoutes);
apiRouter.use('/admin/news', adminNewsRoutes);
apiRouter.use('/gallery', galleryRoutes);
apiRouter.use('/admin/gallery', adminGalleryRoutes);
apiRouter.use('/faculty', facultyRoutes);
apiRouter.use('/admin/faculty', adminFacultyRoutes);
apiRouter.use('/announcements', announcementsRoutes);
apiRouter.use('/announcements', memberAnnouncementsRoutes);
apiRouter.use('/admin/announcements', adminAnnouncementsRoutes);
apiRouter.use('/subscribe', subscribeRoutes);
apiRouter.use('/admin/subscribers', adminSubscribeRoutes);
apiRouter.use('/contact', contactRoutes);

apiRouter.use('/notifications', notificationsRoutes);
apiRouter.use('/messages', messagesRoutes);

apiRouter.use('/admin', adminRoutes);
apiRouter.use('/yearbook', yearbookRoutes);
apiRouter.use('/admin/yearbook', adminYearbookRoutes);
apiRouter.use('/careers', careersRoutes);
apiRouter.use('/admin/careers', adminCareersRoutes);
apiRouter.use('/elections', electionsRoutes);
apiRouter.use('/admin/elections', adminElectionsRoutes);

export { healthRoutes, apiRouter };
