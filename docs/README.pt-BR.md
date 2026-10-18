# Biziva Router — Suas chaves de IA. Um gateway. Menos desperdício.

![Biziva Router](../assets/hero.svg)

[English](../README.md) · [Baixar versões](https://github.com/omatheuslop/biziva-router/releases) · [Codex e Claude](developers.md)

**Código aberto para quem desenvolve com IA e quer controlar as próprias chaves, modelos e gastos.** Conecte suas chaves de OpenAI, Anthropic, Gemini e OpenRouter a um gateway instalado por você, com painel e protocolos nativos.

Suporta texto, imagens, áudio, transcrição, embeddings, vídeo, arquivos e túnel Realtime OpenAI, conforme o modelo e a disponibilidade do provedor. Inclui Responses HTTP/SSE para integrações com Codex e Messages nativo para Claude. Não converte qualquer modelo em substituto equivalente de outro.

## O que você ganha

- **Menos chamadas desnecessárias:** pedidos identificados não são reenviados automaticamente após uma falha incerta. Cache exato pode reaproveitar respostas elegíveis, quando você autoriza.
- **Escolha de custo:** o roteamento automático escolhe entre modelos compatíveis que você previamente aprovou para a tarefa. Exige consentimento; modelos explícitos permanecem explícitos.
- **Menos contexto irrelevante:** remoção opcional de instruções adjacentes exatamente iguais e seleção de documentos opcionais. Não apaga instruções importantes nem resume o histórico escondido.
- **Chaves fora do aplicativo cliente:** segredos criptografados no servidor, tokens separados por conta e isolamento de cache/recursos.
- **Visibilidade:** painel com chamadas, cache e resultados incertos; custos informados e custos desconhecidos ficam separados.
- **Liberdade para hospedar:** licença Apache-2.0, Node.js24+, SQLite e nenhuma dependência npm em execução. Sem mensalidade de software da Biziva para rodar este projeto.

Você continua pagando o consumo do provedor e a hospedagem escolhida. Rodar o Router não dá créditos gratuitos, acesso a modelos pagos nem desconto universal. A assinatura do ChatGPT/Claude não equivale a saldo de API.

## Instalar

Instale Node.js24 ou superior. No terminal:

```sh
git clone https://github.com/omatheuslop/biziva-router.git
cd biziva-router
npm ci
npm run setup
npm start
```

1. Abra http://127.0.0.1:8787.
2. Abra o arquivo `.env` localmente e leia `ROUTER_ADMIN_TOKEN`. Não compartilhe esse arquivo.
3. Em **Administration/Administração**, crie sua conta e guarde o token exibido uma única vez.
4. Conecte a conta com esse token e cadastre sua chave de API do provedor.
5. Aponte seu aplicativo para o gateway usando o token da conta. Siga o [primeiro pedido](quickstart.md), os [exemplos de API](api.md) ou o [guia Codex/Claude](developers.md).

O comando `setup` cria `.env` uma vez e não substitui arquivos existentes. Preserve o arquivo, a chave mestra e o banco entre reinicializações; perder a chave mestra impede recuperar os dados criptografados. O servidor inicia apenas na máquina local. Para acesso externo, configure HTTPS e siga [operações](operations.md).

## Onde a economia aparece — e onde não aparece

Dez pedidos idênticos de chat simples, elegíveis para cache e feitos dentro da janela válida, podem usar uma resposta já obtida em vez de dez chamadas. É um exemplo de funcionamento, não um benchmark de economia. Dez imagens diferentes continuam sendo dez gerações.

A troca de modelo pode reduzir o preço por chamada e alterar a qualidade; por isso depende da sua homologação. Contexto opcional pode reduzir material enviado, mas exige seleção cuidadosa. Em sessões Codex/Claude com ferramentas ou estado, o Router preserva o protocolo: não troca o modelo nem reaproveita a resposta do agente automaticamente. Só mudar a URL não garante gastar menos tokens.

O catálogo automático começa vazio e recusa pedidos sem rota aprovada. O arquivo de exemplo mostra o formato; não contém uma lista de modelos homologados para você.

## Estado da versão

**0.1.1, prévia pública para instalação própria.** Há testes de protocolo, isolamento e falhas com provedores sintéticos e CI público. Ainda não há validação paga de cada modelo/versão do Codex/Claude, auditoria independente ou percentual medido de economia real. Não há cadastro BYOK hospedado incluído.

Encontrou um problema? [Abra uma issue](https://github.com/omatheuslop/biziva-router/issues/new) com passos de reprodução e dados fictícios. Nunca publique chaves, prompts privados ou conversas de clientes. Para segurança, consulte [SECURITY](../SECURITY.md). Melhorias e contribuições: [CONTRIBUTING](../CONTRIBUTING.md).
