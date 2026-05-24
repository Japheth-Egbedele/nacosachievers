import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';
import * as cmsService from '../services/cms.service.js';

/**
 * GET /blog
 */
export async function listPosts(req: Request, res: Response): Promise<void> {
  const { items, meta } = await cmsService.listBlogPosts({
    ...req.query,
    publishedOnly: true,
  });
  sendPaginated(res, items, meta);
}

/**
 * GET /blog/:slug
 */
export async function getPost(req: Request, res: Response): Promise<void> {
  const data = await cmsService.getBlogPostBySlug(req.params.slug!);
  sendSuccess(res, data);
}

/**
 * POST /admin/blog
 */
export async function createPost(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    title: string;
    excerpt?: string;
    content?: Record<string, unknown>;
    status?: string;
    tags?: string[];
  };
  const data = await cmsService.createBlogPost(
    {
      title: body.title,
      excerpt: body.excerpt,
      content: body.content,
      status: body.status,
      tags: body.tags,
      authorId: req.user!.id,
    },
    req.file,
  );
  sendSuccess(res, data, HTTP_STATUS.CREATED);
}

/**
 * PATCH /admin/blog/:id
 */
export async function updatePost(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    title?: string;
    excerpt?: string;
    content?: Record<string, unknown>;
    status?: string;
    tags?: string[];
  };
  const data = await cmsService.updateBlogPost(req.params.id!, body, req.file);
  sendSuccess(res, data);
}

/**
 * DELETE /admin/blog/:id
 */
export async function deletePost(req: Request, res: Response): Promise<void> {
  await cmsService.deleteBlogPost(req.params.id!);
  sendSuccess(res, null, HTTP_STATUS.OK, 'Post deleted');
}

/**
 * GET /admin/blog (all statuses)
 */
export async function listPostsAdmin(req: Request, res: Response): Promise<void> {
  const { items, meta } = await cmsService.listBlogPosts({
    ...req.query,
    publishedOnly: false,
  });
  sendPaginated(res, items, meta);
}
