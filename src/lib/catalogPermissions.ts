export const CATALOG_PERMISSION_CODES = {
  index: 'catalogos',
  areas: 'catalogos_areas',
  cargos: 'catalogos_cargos',
  tiposContrato: 'catalogos_tipos_contrato',
  tiposDotacion: 'catalogos_tipos_dotacion',
  festivos: 'catalogos_festivos',
  arl: 'catalogos_arl',
  eps: 'catalogos_eps',
  afp: 'catalogos_afp',
  ccf: 'catalogos_ccf',
  afc: 'catalogos_afc',
  ips: 'catalogos_ips',
  bancos: 'catalogos_bancos',
  motivosNovedad: 'catalogos_motivos_novedad',
  plataformasPublicacion: 'catalogos_plataformas_publicacion',
  tiposIdentificacion: 'catalogos_tipos_identificacion',
  nivelesEducativos: 'catalogos_niveles_educativos',
  profesiones: 'catalogos_profesiones',
} as const;

export const CATALOG_CHILD_PERMISSION_CODES = Object.values(CATALOG_PERMISSION_CODES).filter(
  (code) => code !== CATALOG_PERMISSION_CODES.index
);
