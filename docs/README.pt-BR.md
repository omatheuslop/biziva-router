# Biziva Router — Suas chaves de IA. Um gateway. Menos desperdício.

![Biziva Router](../assets/hero.svg)

[English](../README.md) · [Baixar versões](https://github.com/omatheuslop/biziva-router/releases) · [Codex e Claude](developers.md)

**Código aberto para quem desenvolve com IA e quer controlar as próprias chaves, modelos e gastos.** Conecte suas chaves de Biziva, OpenAI, Anthropic, Gemini e OpenRouter a um gateway instalado por você, com painel e protocolos nativos.

Suporta texto, imagens, áudio, transcrição, embeddings, vídeo, arquivos e túnel Realtime OpenAI, conforme o modelo e a disponibilidade do provedor. Inclui Responses HTTP/SSE para integrações com Codex e Messages nativo para Claude. Não converte qualquer modelo em substituto equivalente de outro.

## Comece aqui

[**Baixar Windows x64**](https://github.com/omatheuslop/biziva-router/releases/download/v0.3.1/BizivaRouter-windows-x64-setup.exe) · [**Mac Apple Silicon**](https://github.com/omatheuslop/biziva-router/releases/download/v0.3.1/BizivaRouter-macos-arm64.dmg) · [**Linux x64**](https://github.com/omatheuslop/biziva-router/releases/download/v0.3.1/BizivaRouter-linux-x64.tar.gz)

[Guia do primeiro uso e ajuda](start-here.md) · [Demonstração interativa sem API](demo.html) · [Exemplos práticos](recipes.md)

Na demonstração, use **Download raw file** no GitHub e abra o HTML no navegador. Os dados são fictícios: nenhum cadastro, chave ou consumo de API. Para usar de verdade, instale o aplicativo, crie seu acesso local, adicione sua chave e aprove uma rota. Simule antes de autorizar uma geração paga. O software é gratuito; o consumo do provedor é cobrado à parte.

## O que você ganha

- **Menos chamadas desnecessárias:** pedidos identificados não são reenviados automaticamente após uma falha incerta. Cache exato pode reaproveitar respostas elegíveis, quando você autoriza.
- **Escolha de custo:** o roteamento automático escolhe entre modelos compatíveis que você previamente aprovou para a tarefa. Exige consentimento; modelos explícitos permanecem explícitos.
- **Menos contexto irrelevante:** remoção opcional de instruções adjacentes exatamente iguais e seleção de documentos opcionais. Não apaga instruções importantes nem resume o histórico escondido.
- **Chaves fora do aplicativo cliente:** segredos criptografados no servidor, tokens separados por conta e isolamento de cache/recursos.
- **Visibilidade:** painel com chamadas, cache e resultados incertos; custos informados e custos desconhecidos ficam separados.
- **Liberdade para hospedar:** licença Apache-2.0, Node.js24+, SQLite e nenhuma dependência npm em execução. Sem mensalidade de software da Biziva para rodar este projeto.

Você continua pagando o consumo do provedor e a hospedagem escolhida. Rodar o Router não dá créditos gratuitos, acesso a modelos pagos nem desconto universal. A assinatura do ChatGPT/Claude não equivale a saldo de API.

## Abrir o aplicativo

Baixe o pacote do seu sistema nos arquivos de uma [versão publicada](https://github.com/omatheuslop/biziva-router/releases). O executável inclui Node e abre o painel local da Biziva no navegador. Os pacotes são uma prévia: o Mac ainda não tem notarização Apple e o Windows não tem assinatura de editor. A disponibilidade de cada sistema depende dos arquivos anexados à versão.

O menu oferece **Chat das suas IAs**, **Minhas chaves**, **Rotas e economia**, **Assistentes**, **Consumo** e **Acesso e integração**. Os seis assistentes respondem por função; não executam código nem ações externas. Use o catálogo público OpenRouter para preencher preços e depois aprove a qualidade por tarefa. Você usa suas próprias chaves e saldo.

## Instalar pelo código-fonte

Instale Node.js24 ou superior. No terminal:

```sh
git clone https://github.com/omatheuslop/biziva-router.git
cd biziva-router
npm ci
npm run setup
npm start
```

1. No terminal onde executou `npm start`, clique no **link privado de primeiro acesso**. Ele aparece apenas em uma instalação local nova e vale por dez minutos. Não compartilhe o link.
2. Escolha um nome e uma senha de pelo menos 10 caracteres, repita a senha e clique em **Criar meu acesso e começar**. Você não precisa abrir o arquivo `.env`.
3. Você já estará conectado. Quando voltar, entre com seu nome e senha. Em Acesso e integração, gere um código separado caso queira conectar outro aplicativo.
4. Escolha o serviço de IA e adicione a chave de API fornecida pela sua conta nesse serviço.
5. Em **Rotas e economia**, cadastre os modelos, preços e tarefas que você aprovou. É tudo pelo painel, sem editar arquivos. Preços precisam ser conferidos no seu provedor; mais barato não significa qualidade equivalente.
6. Escolha **Modelo fixo**, **Reaproveitar com segurança** ou **Economia autorizada**. A troca de modelo precisa da sua autorização explícita.
7. Escreva um pedido e clique em **Simular sem gastar**. Confira modelo e estimativa. Somente depois de marcar a autorização e clicar em **Confirmar e enviar uma vez** o pedido vai ao provedor e pode gerar custo.

O atalho de primeiro acesso exige terminal interativo, servidor local e nenhuma conta criada. Em servidor/instalação compartilhada, peça ao administrador um código pessoal; o painel mantém o acesso avançado autenticado. A estimativa não é teto garantido da fatura. A jornada e os limites estão no [guia do espaço de trabalho](workspace.md). Gemini nativo, uploads, Realtime e sessões com ferramentas continuam pela API; o teste gráfico usa pedidos JSON sem streaming/estado nas opções oferecidas.

O comando `setup` cria `.env` uma vez e não substitui arquivos existentes. Preserve o arquivo, a chave mestra e o banco entre reinicializações; perder a chave mestra impede recuperar os dados criptografados. O servidor inicia apenas na máquina local. Para acesso externo, configure HTTPS e siga [operações](operations.md).

## Onde a economia aparece — e onde não aparece

Dez pedidos idênticos de chat simples, elegíveis para cache e feitos dentro da janela válida, podem usar uma resposta já obtida em vez de dez chamadas. É um exemplo de funcionamento, não um benchmark de economia. Dez imagens diferentes continuam sendo dez gerações.

A troca de modelo pode reduzir o preço por chamada e alterar a qualidade; por isso depende da sua homologação. Contexto opcional pode reduzir material enviado, mas exige seleção cuidadosa. Em sessões Codex/Claude com ferramentas ou estado, o Router preserva o protocolo: não troca o modelo nem reaproveita a resposta do agente automaticamente. Só mudar a URL não garante gastar menos tokens.

O catálogo automático começa vazio e recusa pedidos sem rota aprovada. O arquivo de exemplo mostra o formato; não contém uma lista de modelos homologados para você.

## Estado da versão

**0.3.1, prévia pública para instalação própria.** Há testes de protocolo, isolamento e falhas com provedores sintéticos e CI público. Ainda não há validação paga de cada modelo/versão do Codex/Claude, auditoria independente ou percentual medido de economia real. Não há cadastro BYOK hospedado incluído.

Encontrou um problema? [Abra uma issue](https://github.com/omatheuslop/biziva-router/issues/new) com passos de reprodução e dados fictícios. Nunca publique chaves, prompts privados ou conversas de clientes. Para segurança, consulte [SECURITY](../SECURITY.md). Melhorias e contribuições: [CONTRIBUTING](../CONTRIBUTING.md).

Criado e mantido por [Matheus Lopes](https://github.com/omatheuslop), da [Biziva](https://biziva.com.br). Software gratuito e de código aberto; consumo dos provedores e hospedagem continuam separados.
