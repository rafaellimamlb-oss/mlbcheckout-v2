export interface Produto {
  id?: string;
  codigo_erp: string;
  ean13: string;
  descricao: string;
  unidade?: string;
  ativo?: boolean;
  created_at?: string;
}
