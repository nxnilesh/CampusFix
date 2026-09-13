import { Router, Request, Response } from 'express';
import { prisma, isDatabaseConnectionError, DATABASE_UNAVAILABLE_MESSAGE } from '../db.js';
import { AuthenticatedRequest, requireRole } from '../auth.js';
import { z } from 'zod';

const router = Router();

const serviceSchema = z.object({
  name: z.string().min(2, 'Service name must be at least 2 characters').max(80),
  description: z.string().max(300).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  slaHours: z.number().int().positive().optional().default(48),
  isActive: z.boolean().optional(),
});

const DEFAULT_SERVICES = [
  { id: 'svc-1', name: 'Classroom & Bench Repair', description: 'Fixing loose benches, broken desks, and lecture hall seating', slaHours: 48, isActive: true },
  { id: 'svc-2', name: 'Electrical Wiring & Power Outlets', description: 'Repairing short circuits, sparking outlets, and broken switches', slaHours: 24, isActive: true },
  { id: 'svc-3', name: 'Air Conditioning Maintenance', description: 'HVAC repair, cooling coil cleaning, and thermostat fixes', slaHours: 48, isActive: true },
  { id: 'svc-4', name: 'Washroom & Pipeline Plumbing', description: 'Fixing leaking faucets, blocked drains, and low water pressure', slaHours: 24, isActive: true },
  { id: 'svc-5', name: 'Campus Wi-Fi & LAN Diagnostics', description: 'Restoring router coverage, captive portal drops, and LAN sockets', slaHours: 24, isActive: true },
  { id: 'svc-6', name: 'Janitorial & Floor Sanitation', description: 'Disinfection, floor spill cleanup, and waste bin servicing', slaHours: 12, isActive: true },
  { id: 'svc-7', name: 'Lab Hardware & Equipment Care', description: 'Servicing laboratory power strips, oscilloscopes, and instruments', slaHours: 48, isActive: true },
  { id: 'svc-8', name: 'Door, Window & Lock Repair', description: 'Repairing broken door hinges, glass panes, and latch locks', slaHours: 48, isActive: true },
  { id: 'svc-9', name: 'Emergency Safety & Lighting', description: 'Inspection and repair of pathway lighting and emergency alarms', slaHours: 12, isActive: true },
];

// GET /api/services
router.get('/', async (req: Request, res: Response) => {
  try {
    const { categoryId, all } = req.query;
    const where: any = {};

    if (all !== 'true') {
      where.isActive = true;
    }

    if (categoryId && typeof categoryId === 'string') {
      where.categoryId = categoryId;
    }

    const services = await prisma.service.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        category: {
          select: { id: true, name: true, icon: true },
        },
        _count: {
          select: { issues: true },
        },
      },
    });

    if (services.length === 0) {
      return res.json({
        success: true,
        data: DEFAULT_SERVICES,
        count: DEFAULT_SERVICES.length,
      });
    }

    return res.json({
      success: true,
      data: services,
      count: services.length,
    });
  } catch (error: any) {
    if (isDatabaseConnectionError(error)) {
      console.warn('[CampusFix DB] Notice: PostgreSQL is not connected yet, serving default campus services catalog.');
      return res.json({
        success: true,
        data: DEFAULT_SERVICES,
        count: DEFAULT_SERVICES.length,
        notice: DATABASE_UNAVAILABLE_MESSAGE,
      });
    }

    console.error('Error fetching campus services:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve campus services.',
    });
  }
});

// POST /api/services - Admin only
router.post('/', requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = serviceSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues[0]?.message || 'Validation failed',
      });
    }

    const { name, description, categoryId, slaHours, isActive } = parseResult.data;

    const existing = await prisma.service.findUnique({
      where: { name },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'A service with this name already exists.',
      });
    }

    const service = await prisma.service.create({
      data: {
        name,
        description: description || null,
        categoryId: categoryId || null,
        slaHours: slaHours || 48,
        isActive: isActive !== undefined ? isActive : true,
      },
      include: {
        category: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Service created successfully.',
      data: service,
    });
  } catch (error: any) {
    if (isDatabaseConnectionError(error)) {
      return res.status(503).json({ success: false, error: DATABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error creating service:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create campus service.',
    });
  }
});

// PATCH /api/services/:id - Admin only
router.patch('/:id', requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parseResult = serviceSchema.partial().safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues[0]?.message || 'Validation failed',
      });
    }

    const service = await prisma.service.update({
      where: { id },
      data: parseResult.data,
      include: { category: true },
    });

    return res.json({
      success: true,
      message: 'Service updated successfully.',
      data: service,
    });
  } catch (error: any) {
    if (isDatabaseConnectionError(error)) {
      return res.status(503).json({ success: false, error: DATABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error updating service:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update campus service.',
    });
  }
});

// DELETE /api/services/:id - Admin only (soft toggle)
router.delete('/:id', requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const updated = await prisma.service.update({
      where: { id },
      data: { isActive: false },
    });

    return res.json({
      success: true,
      message: 'Service deactivated successfully.',
      data: updated,
    });
  } catch (error: any) {
    if (isDatabaseConnectionError(error)) {
      return res.status(503).json({ success: false, error: DATABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error deactivating service:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to deactivate service.',
    });
  }
});

export default router;
