import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';
import { sendSuccess } from '../utils/response.js';
import * as messagesService from '../services/messages.service.js';

/**
 * GET /messages/conversations
 */
export async function listConversations(req: Request, res: Response): Promise<void> {
  const data = await messagesService.listConversations(req.user!.id);
  sendSuccess(res, data);
}

/**
 * POST /messages/conversations
 */
export async function createConversation(req: Request, res: Response): Promise<void> {
  const { user_id } = req.body as { user_id: string };
  const data = await messagesService.getOrCreateConversation(req.user!.id, user_id);
  sendSuccess(res, data, HTTP_STATUS.OK);
}

/**
 * GET /messages/conversations/:id
 */
export async function getConversation(req: Request, res: Response): Promise<void> {
  const { items, meta, conversation } = await messagesService.getConversation(
    req.user!.id,
    req.params.id!,
    req.query,
  );
  sendSuccess(res, { conversation, messages: items, meta });
}

/**
 * POST /messages/conversations/:id/send
 */
export async function sendMessage(req: Request, res: Response): Promise<void> {
  const { content } = req.body as { content: string };
  const data = await messagesService.sendMessage(req.user!.id, req.params.id!, content);
  sendSuccess(res, data, HTTP_STATUS.CREATED);
}

/**
 * DELETE /messages/:messageId
 */
export async function deleteMessage(req: Request, res: Response): Promise<void> {
  await messagesService.deleteMessage(req.user!.id, req.params.messageId!);
  sendSuccess(res, null, HTTP_STATUS.OK, 'Message deleted');
}
