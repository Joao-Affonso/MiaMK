# Clone MIA

Aplicação web local para consultar a aba `Base tratada` do arquivo `Base Spotifinder.xlsx`, sem uso de API externa.

## Requisitos

- Node.js 22+

## Como rodar

1. Execute `npm start`
2. Abra `http://localhost:3000`

## O que o painel faz

- Filtra por estado, cidade, exibidor, tipo, tipo de mídia, vertical e exposição
- Gera rankings agrupados
- Calcula contagem, soma, média, mínimo e máximo de `fluxo_de_passantes`
- Exporta o resultado em CSV

## Observação

O sistema funciona 100% localmente sobre a planilha `Base Spotifinder.xlsx`. A chave Gemini não é mais necessária para a experiência principal.
