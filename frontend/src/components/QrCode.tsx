import { encode } from 'uqr';
import estilos from './QrCode.module.css';

interface Props {
  valor: string;
  /** Descrição para leitores de tela (o QR em si é só imagem). */
  rotulo: string;
}

/**
 * QR code desenhado como SVG pelo próprio React: a biblioteca uqr só calcula a matriz de
 * módulos, sem innerHTML e sem chamar serviço externo (a CSP só libera a própria origem).
 */
export function QrCode({ valor, rotulo }: Props) {
  const { data, size } = encode(valor, { border: 2 });
  // Um único <path> com um quadrado 1x1 por módulo escuro: leve mesmo para URLs longas
  const caminho = data
    .flatMap((linha, y) => linha.map((escuro, x) => (escuro ? `M${x} ${y}h1v1h-1z` : '')))
    .join('');
  return (
    <svg
      className={estilos.qr}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={rotulo}
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} className={estilos.fundo} />
      <path d={caminho} className={estilos.modulo} />
    </svg>
  );
}
