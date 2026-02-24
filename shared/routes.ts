import { z } from 'zod';
import { 
  insertProfileSchema, 
  insertProjectSchema, 
  insertDocumentSchema, 
  insertEventSchema, 
  insertInspectionSchema,
  insertDefectSchema,
  insertBauaktSchema,
  projects,
  profiles,
  documents,
  events,
  inspections,
  defects,
  bauakt,
  users
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  })
};

// Response types with relations built-in for simplicity
const userSchema = z.custom<typeof users.$inferSelect>();
const profileSchema = z.custom<typeof profiles.$inferSelect>();
const projectSchema = z.custom<typeof projects.$inferSelect>();
const documentSchema = z.custom<typeof documents.$inferSelect>();
const eventSchema = z.custom<typeof events.$inferSelect>();
const inspectionSchema = z.custom<typeof inspections.$inferSelect>();
const defectSchema = z.custom<typeof defects.$inferSelect>();

const projectWithClientSchema = projectSchema.and(z.object({
  client: userSchema.and(z.object({ profile: profileSchema.optional() })).optional(),
  verwaltung: userSchema.and(z.object({ profile: profileSchema.optional() })).optional()
}));

const inspectionWithEngineerSchema = inspectionSchema.and(z.object({
  engineer: userSchema.and(z.object({ profile: profileSchema.optional() })).optional(),
  defects: z.array(defectSchema).optional()
}));


export const api = {
  profiles: {
    get: {
      method: 'GET' as const,
      path: '/api/profiles/me' as const,
      responses: {
        200: profileSchema,
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized
      }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/profiles/me' as const,
      input: insertProfileSchema.partial(),
      responses: {
        200: profileSchema,
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized
      }
    }
  },
  users: {
    listAll: {
      method: 'GET' as const,
      path: '/api/users' as const,
      responses: {
        200: z.array(userSchema.and(z.object({ profile: profileSchema.optional() }))),
        401: errorSchemas.unauthorized,
        403: errorSchemas.unauthorized
      }
    },
    listClients: {
      method: 'GET' as const,
      path: '/api/users/clients' as const,
      responses: {
        200: z.array(userSchema.and(z.object({ profile: profileSchema.optional() }))),
        401: errorSchemas.unauthorized,
        403: errorSchemas.unauthorized
      }
    },
    listEngineers: {
      method: 'GET' as const,
      path: '/api/users/engineers' as const,
      responses: {
        200: z.array(userSchema.and(z.object({ profile: profileSchema.optional() }))),
        401: errorSchemas.unauthorized,
        403: errorSchemas.unauthorized
      }
    },
    updateRole: {
      method: 'PUT' as const,
      path: '/api/users/:userId/role' as const,
      input: z.object({ role: z.enum(["admin", "hausverwaltung", "eigentuemer"]) }),
      responses: {
        200: profileSchema,
        401: errorSchemas.unauthorized,
        403: errorSchemas.unauthorized,
        404: errorSchemas.notFound
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/users' as const,
      input: z.object({
        email: z.string().email(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        role: z.enum(["admin", "hausverwaltung", "eigentuemer"]),
        company: z.string().optional(),
        phone: z.string().optional(),
      }),
      responses: {
        201: userSchema.and(z.object({ profile: profileSchema.optional() })),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        403: errorSchemas.unauthorized
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/users/:userId' as const,
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
        403: errorSchemas.unauthorized,
        404: errorSchemas.notFound
      }
    }
  },
  projects: {
    list: {
      method: 'GET' as const,
      path: '/api/projects' as const,
      responses: {
        200: z.array(projectWithClientSchema),
        401: errorSchemas.unauthorized
      }
    },
    get: {
      method: 'GET' as const,
      path: '/api/projects/:id' as const,
      responses: {
        200: projectWithClientSchema,
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/projects' as const,
      input: insertProjectSchema,
      responses: {
        201: projectSchema,
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        403: errorSchemas.unauthorized
      }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/projects/:id' as const,
      input: insertProjectSchema.partial(),
      responses: {
        200: projectSchema,
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
        403: errorSchemas.unauthorized
      }
    },
  },
  documents: {
    list: {
      method: 'GET' as const,
      path: '/api/projects/:projectId/documents' as const,
      responses: {
        200: z.array(documentSchema),
        401: errorSchemas.unauthorized
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/projects/:projectId/documents' as const,
      input: insertDocumentSchema, // We'll handle file uploads manually but track metadata via DB
      responses: {
        201: documentSchema,
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/documents/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized
      }
    }
  },
  events: {
    list: {
      method: 'GET' as const,
      path: '/api/events' as const,
      input: z.object({
        projectId: z.coerce.number().optional()
      }).optional(),
      responses: {
        200: z.array(eventSchema),
        401: errorSchemas.unauthorized
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/events' as const,
      input: insertEventSchema,
      responses: {
        201: eventSchema,
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        403: errorSchemas.unauthorized
      }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/events/:id' as const,
      input: insertEventSchema.partial(),
      responses: {
        200: eventSchema,
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
        403: errorSchemas.unauthorized
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/events/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
        403: errorSchemas.unauthorized
      }
    }
  },
  inspections: {
    list: {
      method: 'GET' as const,
      path: '/api/projects/:projectId/inspections' as const,
      responses: {
        200: z.array(inspectionWithEngineerSchema),
        401: errorSchemas.unauthorized
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/projects/:projectId/inspections' as const,
      input: insertInspectionSchema,
      responses: {
        201: inspectionSchema,
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        403: errorSchemas.unauthorized
      }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/inspections/:id' as const,
      input: insertInspectionSchema.partial(),
      responses: {
        200: inspectionSchema,
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
        403: errorSchemas.unauthorized
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/inspections/:id' as const,
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
        403: errorSchemas.unauthorized
      }
    }
  },
  defects: {
    summary: {
      method: 'GET' as const,
      path: '/api/defects/summary' as const,
      responses: {
        200: z.array(z.object({
          projectId: z.number(),
          mangelStatus: z.enum(["kein_mangel", "leichter_mangel", "grober_mangel"]),
        })),
        401: errorSchemas.unauthorized
      }
    },
    list: {
      method: 'GET' as const,
      path: '/api/inspections/:inspectionId/defects' as const,
      responses: {
        200: z.array(defectSchema),
        401: errorSchemas.unauthorized
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/inspections/:inspectionId/defects' as const,
      input: insertDefectSchema,
      responses: {
        201: defectSchema,
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        403: errorSchemas.unauthorized
      }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/defects/:id' as const,
      input: insertDefectSchema.partial(),
      responses: {
        200: defectSchema,
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
        403: errorSchemas.unauthorized
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/defects/:id' as const,
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
        403: errorSchemas.unauthorized
      }
    }
  },
  bauakte: {
    list: {
      method: 'GET' as const,
      path: '/api/projects/:projectId/bauakte' as const,
      responses: {
        200: z.array(z.object({
          id: z.number(),
          projectId: z.number(),
          dateiname: z.string(),
          jahr: z.string().nullable(),
          beschreibung: z.string().nullable(),
          art: z.string().nullable(),
          anmerkung: z.string().nullable(),
          fileUrl: z.string().nullable(),
        })),
        401: errorSchemas.unauthorized
      }
    },
    import: {
      method: 'POST' as const,
      path: '/api/projects/:projectId/bauakte/import' as const,
      responses: {
        200: z.object({ count: z.number() }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        403: errorSchemas.unauthorized
      }
    },
    uploadFile: {
      method: 'POST' as const,
      path: '/api/projects/:projectId/bauakte/upload' as const,
      responses: {
        200: z.object({ filename: z.string(), url: z.string() }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        403: errorSchemas.unauthorized
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// Re-export types from schema for frontend hooks
export type { 
  CreateProjectRequest, 
  UpdateProjectRequest, 
  CreateEventRequest, 
  CreateInspectionRequest, 
  UpdateInspectionRequest,
  CreateDocumentRequest,
  CreateDefectRequest,
  UpdateDefectRequest,
  Defect
} from './schema';
