// Centralização de tipos compartilhados para futuras implementações.

export interface BaseEntity {
  id?: string;
}

export interface AppUser extends BaseEntity {
  email?: string;
}
