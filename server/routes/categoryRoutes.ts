import { Router, Request, Response } from 'express';
import { prisma, isDatabaseConnectionError, DATABASE_UNAVAILABLE_MESSAGE } from '../db.js';
import { AuthenticatedRequest, requireRole } from '../auth.js';
import { z } from 'zod';

const router = Router();

const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').max(60),
  description: z.string().max(255).optional().nullable(),
  icon: z.string().max(40).optional().nullable(),
  isActive: z.boolean().optional(),
});

// Default fallback catalog if PostgreSQL connection has not been configured yet
const DEFAULT_CATALOG = [
  { id: 'cat-1', name: 'Electrical', description: 'Power supply, wiring, switches, and lighting fixtures', isActive: true },
  { id: 'cat-2', name: 'Plumbing', description: 'Water supply, pipe leaks, drainage, washrooms', isActive: true },
  { id: 'cat-3', name: 'AC & Cooling', description: 'Air conditioners, ventilation ducts, and cooling units', isActive: true },
  { id: 'cat-4', name: 'Wi-Fi / Network', description: 'Campus Wi-Fi connectivity, LAN ports, and equipment', isActive: true },
  { id: 'cat-5', name: 'Furniture', description: 'Desks, benches, chairs, whiteboards, classroom furniture', isActive: true },
  { id: 'cat-6', name: 'Cleanliness', description: 'Sanitation, trash collection, corridor cleaning', isActive: true },
  { id: 'cat-7', name: 'Laboratory', description: 'Lab computers, instruments, chemical storage', isActive: true },
  { id: 'cat-8', name: 'Safety', description: 'Fire extinguishers, emergency exits, handrails, lighting', isActive: true },
  { id: 'cat-9', name: 'Infrastructure', description: 'Civil repairs, doors, windows, paint, and pathways', isActive: true },
  { id: 'cat-10', name: 'Other', description: 'General campus maintenance and miscellaneous requests', isActive: true },
];

// GET /api/categories
router.get('/', async (req: Request, res: Response) => {
  try {
    const { all } = req.query;
    const where: any = {};
    if (all !== 'true') {
      where.isActive = true;
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        services: {
          where: { isActive: true },
          select: { id: true, name: true, description: true, slaHours: true },
        },
        _count: {
          select: { issues: true },
        },
      },
    });

    if (categories.length === 0) {
      return res.json({
        success: true,
        data: DEFAULT_CATALOG,
        count: DEFAULT_CATALOG.length,
      });
    }

    return res.json({
      success: true,
      data: categories,
      count: categories.length,
    });
  } catch (error: any) {
    if (isDatabaseConnectionError(error)) {
      return res.status(503).json({ success: false, error: DATABASE_UNAVAILABLE_MESSAGE });
    }

    console.error('Error fetching categories:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve campus categories.',
    });
  }
});

// POST /api/categories - Admin only
router.post('/', requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = categorySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues[0]?.message || 'Validation failed',
      });
    }

    const { name, description, icon, isActive } = parseResult.data;

    const existing = await prisma.category.findUnique({
      where: { name },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'A category with this name already exists.',
      });
    }

    const category = await prisma.category.create({
      data: {
        name,
        description: description || null,
        icon: icon || 'HelpCircle',
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      data: category,
    });
  } catch (error: any) {
    if (isDatabaseConnectionError(error)) {
      return res.status(503).json({ success: false, error: DATABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error creating category:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create category.',
    });
  }
});

// PATCH /api/categories/:id - Admin only
router.patch('/:id', requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parseResult = categorySchema.partial().safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues[0]?.message || 'Validation failed',
      });
    }

    const category = await prisma.category.update({
      where: { id },
      data: parseResult.data,
    });

    return res.json({
      success: true,
      message: 'Category updated successfully.',
      data: category,
    });
  } catch (error: any) {
    if (isDatabaseConnectionError(error)) {
      return res.status(503).json({ success: false, error: DATABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error updating category:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update category.',
    });
  }
});

// DELETE /api/categories/:id - Admin only (soft toggle)
router.delete('/:id', requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const updated = await prisma.category.update({
      where: { id },
      data: { isActive: false },
    });

    return res.json({
      success: true,
      message: 'Category deactivated successfully.',
      data: updated,
    });
  } catch (error: any) {
    if (isDatabaseConnectionError(error)) {
      return res.status(503).json({ success: false, error: DATABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error deactivating category:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to deactivate category.',
    });
  }
});

export default router;
