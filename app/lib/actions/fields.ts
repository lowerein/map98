"use server"

import { prisma } from "@/lib/prisma"
import { requireUser, requireAdmin } from "@/lib/auth-helpers"
import type { FieldType } from "@prisma/client"

export type FieldDTO = {
  id: string
  key: string
  label: string
  type: "text" | "number" | "checkbox" | "file" | "image" | "date" |"textarea"
  isRequired: boolean
  isActive: boolean
  isSystemDefault: boolean
  order: number
}

const DEFAULT_FIELDS: Omit<FieldDTO, "id">[] = [
  { key: "remarks", label: "備註 / 心得", type: "text", isRequired: false, isActive: true, isSystemDefault: true, order: 0 },
  { key: "photos", label: "景點相片", type: "image", isRequired: false, isActive: true, isSystemDefault: true, order: 1 },
  { key: "attachments", label: "相關附件 (PDF/電子飛)", type: "file", isRequired: false, isActive: true, isSystemDefault: true, order: 2 },
  { key: "is_visited", label: "去咗未 (Visited)", type: "checkbox", isRequired: false, isActive: true, isSystemDefault: true, order: 3 },
]

function toEnum(t: FieldDTO["type"]): FieldType {
  return t.toUpperCase() as FieldType
}
function fromEnum(t: FieldType): FieldDTO["type"] {
  return t.toLowerCase() as FieldDTO["type"]
}
function serialize(f: {
  id: string
  key: string
  label: string
  type: FieldType
  isRequired: boolean
  isActive: boolean
  isSystemDefault: boolean
  order: number
}): FieldDTO {
  return { ...f, type: fromEnum(f.type) }
}

/** Seeds the four system-default fields the first time the table is empty. */
async function ensureSeeded() {
  const count = await prisma.globalField.count()
  if (count > 0) return
  await prisma.globalField.createMany({
    data: DEFAULT_FIELDS.map((f) => ({ ...f, type: toEnum(f.type) })),
    skipDuplicates: true,
  })
}

/** Active fields, in display order — consumed by the planner's place form. */
export async function getActiveFields(): Promise<FieldDTO[]> {
  await requireUser()
  await ensureSeeded()
  const fields = await prisma.globalField.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  })
  return fields.map(serialize)
}

/** All fields (active + hidden) for the admin management screen. */
export async function getAllFields(): Promise<FieldDTO[]> {
  await requireAdmin()
  await ensureSeeded()
  const fields = await prisma.globalField.findMany({ orderBy: { order: "asc" } })
  return fields.map(serialize)
}

/** Replace the entire global field configuration (admin only). */
export async function saveFields(fields: FieldDTO[]): Promise<FieldDTO[]> {
  await requireAdmin()

  const keptKeys = fields.map((f) => f.key)

  await prisma.$transaction([
    // Remove fields that were deleted in the admin UI (system defaults are
    // never offered for deletion there, so they always remain in `fields`).
    prisma.globalField.deleteMany({ where: { key: { notIn: keptKeys } } }),
    ...fields.map((f, idx) =>
      prisma.globalField.upsert({
        where: { key: f.key },
        create: {
          key: f.key,
          label: f.label,
          type: toEnum(f.type),
          isRequired: f.isRequired,
          isActive: f.isActive,
          isSystemDefault: f.isSystemDefault,
          order: idx,
        },
        update: {
          label: f.label,
          type: toEnum(f.type),
          isRequired: f.isRequired,
          isActive: f.isActive,
          order: idx,
        },
      })
    ),
  ])

  const updated = await prisma.globalField.findMany({ orderBy: { order: "asc" } })
  return updated.map(serialize)
}
