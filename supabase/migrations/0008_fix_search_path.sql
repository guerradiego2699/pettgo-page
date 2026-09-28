-- PettGo — corrige "Function Search Path Mutable" detectado por el Security
-- Advisor en las funciones nuevas de productos_pyme.

alter function public.set_actualizado_en() set search_path = public;
alter function public.metricas_producto(timestamptz, timestamptz) set search_path = public;
alter function public.metricas_diarias(timestamptz, timestamptz) set search_path = public;
