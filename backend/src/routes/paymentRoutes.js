import { Router } from 'express';
import { requireAuthenticatedUser } from '../services/authService.js';
import {
  confirmDummyDepositByReference,
  createDummyDepositSession,
  listDummyDepositsForUser
} from '../services/paymentService.js';

const paymentRoutes = Router();

function statusCodeForPaymentError(errorCode) {
  switch (errorCode) {
    case 'INVALID_ITEM_ID':
    case 'INVALID_REFERENCE':
    case 'INVALID_AMOUNT':
      return 400;
    case 'ITEM_NOT_FOUND':
    case 'DEPOSIT_NOT_FOUND':
      return 404;
    case 'DEPOSIT_EXPIRED':
      return 409;
    default:
      return 500;
  }
}

paymentRoutes.post('/deposits', async (request, response) => {
  try {
    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const deposit = await createDummyDepositSession({
      userGoogleId: user.googleId,
      itemId: request.body?.itemId,
      amount: request.body?.amount
    });

    return response.status(201).json({
      deposit
    });
  } catch (error) {
    const statusCode = statusCodeForPaymentError(error?.code);
    const fallbackMessage = 'Failed to create dummy deposit.';
    console.error('[PAYMENT_DEPOSIT_CREATE_ERROR]', error?.code || 'UNKNOWN', error.message);
    return response.status(statusCode).json({ error: error?.message || fallbackMessage });
  }
});

paymentRoutes.post('/deposits/:referenceId/confirm', async (request, response) => {
  try {
    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const deposit = await confirmDummyDepositByReference({
      userGoogleId: user.googleId,
      referenceId: request.params?.referenceId
    });

    return response.json({ deposit });
  } catch (error) {
    const statusCode = statusCodeForPaymentError(error?.code);
    const fallbackMessage = 'Failed to confirm dummy deposit.';
    console.error('[PAYMENT_DEPOSIT_CONFIRM_ERROR]', error?.code || 'UNKNOWN', error.message);
    return response.status(statusCode).json({ error: error?.message || fallbackMessage });
  }
});

paymentRoutes.get('/deposits/mine', async (request, response) => {
  try {
    const { user } = await requireAuthenticatedUser(request);

    if (!user) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    const deposits = await listDummyDepositsForUser({
      userGoogleId: user.googleId,
      limit: request.query?.limit
    });

    return response.json({ deposits });
  } catch (error) {
    console.error('[PAYMENT_DEPOSIT_LIST_ERROR]', error.message);
    return response.status(500).json({ error: 'Failed to load reserved deposits.' });
  }
});

export default paymentRoutes;
