# Biziva Router 0.4 — uso e atualização

Atualize o aplicativo e preserve a pasta `~/.biziva-router`. O primeiro início migra o banco sem apagar chaves ou contas. O banco e a chave mestra continuam necessários; não os exclua para resolver login. Faça uma cópia protegida deles antes da atualização. Os pacotes continuam uma prévia sem assinatura de editor/notarização.

## Correções auditadas

O playground passa explicitamente o provedor escolhido. Anteriormente, os caminhos de chat Biziva/OpenRouter podiam cair no padrão OpenAI. A chave e a sessão são reconferidas antes do envio, inclusive depois de receber um corpo lento. O startup adquire bloqueio antes de abrir o banco, evitando que uma segunda instância transforme pedidos ativos em incertos. Reabrir o aplicativo só abre uma instância existente se ela provar possuir o segredo do bloqueio local. Uma versão antiga já aberta precisa ser encerrada antes da primeira abertura da nova versão.

Em Acesso e integração, confirme Encerrar aplicativo. Disponível só no aplicativo local com uma conta; recusa encerrar durante inferência ou Realtime. Novos envios são bloqueados ao iniciar o encerramento. Servidores compartilhados continuam sob o operador.

## Conexão e preços

Minhas chaves permite verificar a Biziva por GET autenticado de catálogo, sem inferência. Exige permissão de catálogo; não comprova saldo ou acesso a toda modalidade. Carregue um modelo e seus preços, escolha a função e aprove a qualidade. Modelos sem preço/contexto compatíveis não são importados. O Router não usa uma chave da Biziva compartilhada.

Rotas podem ser editadas; marcar a aprovação confirma a conferência do preço e renova sua data. Há avisos na última semana e após 30 dias. USD e BRL são separados, sem câmbio implícito e sem comparar números de moedas distintas. `priceCurrency` declara a moeda; por compatibilidade, os campos legados `inputUsdPerMillion`, `outputUsdPerMillion` e `usdPerUnit` guardam o valor na moeda declarada. Catálogos antigos sem moeda continuam USD.

Na simulação, use `currency: "BRL"` e `maxEstimatedAmount` para reais. `maxEstimatedUsd` continua aceito somente para USD. A resposta contém `estimatedAmount` e `currency`; `estimatedUsd` só aparece em USD. Integrações automáticas nativas com rotas BRL devem enviar `X-Biziva-Price-Currency: BRL`. Preços e estimativas não são garantia de cobrança final nem limite de gastos no provedor.

## Imagem e voz

O painel habilita somente os caminhos implementados para o provedor. Tamanho, qualidade, voz e formato vêm das restrições de suas rotas aprovadas; deixar em branco mantém o padrão do modelo. Opções técnicas JSON ficam em Avançado. Esses controles não certificam suporte de todo modelo, nem reduzem qualidade silenciosamente.

## Senha, recuperação e backup

Em Acesso e integração, informe sua senha atual para alterar a senha ou gerar um código de recuperação. Trocar senha revoga sessões, código original e integração anteriores, preservando dados. Gere outro código de integração para aplicativos externos. O código de recuperação substitui o anterior e funciona uma vez na tela Esqueci minha senha local. Guarde-o offline; não é recuperação por e-mail. Sem código ou outro acesso autorizado, não há atalho que dispense autenticação. Contas administradas antigas que só têm código pessoal continuam entrando por código; o operador deve administrar sua recuperação.

Backup exige a senha atual e uma senha separada de pelo menos 12 caracteres. O arquivo usa scrypt e AES-256-GCM e inclui apenas esta conta: chaves, rotas, conversas, recursos e registros que evitam duplicidade. Não inclui senha de login, código de recuperação, chave mestra nem outras contas. A senha do backup é necessária para restaurá-lo.

Importe somente em uma conta autenticada de mesmo nome. A restauração adiciona chaves ausentes, preserva as já configuradas, não sobrescreve rotas existentes e mantém registros mais recentes de pedidos. Conflitos de identificadores abortam a importação. Pedidos que estavam em execução no backup entram como incertos, nunca são reenviados. Limites do painel: 50 conversas, 2.000 operações e 8 MB de conteúdo de backup; para bancos maiores, use backup offline do banco e da chave mestra com o serviço encerrado. Não compartilhe arquivos ou senhas em issues.

## Conversas e pedidos

O histórico permanece temporário por padrão. Ative Guardar esta conversa ou Salvar conversa agora para persistir texto criptografado por conta. Até 50 conversas, 40 mensagens/conversa; mídia não é arquivada nessa área. Trocar de provedor/função inicia outra conversa para não misturar contexto. Mensagens restauradas só são enviadas à IA quando você confirma um novo pedido.

Meus pedidos mostra os últimos 100 pedidos com idempotência, respostas JSON salvas e identificadores. Consultar resultado local não gera nada. Status remoto usa somente GET para Responses/vídeos OpenAI cujo identificador foi confirmado, pertence à conta e tem a mesma chave. Há intervalo mínimo de dez segundos entre consultas. Uma falha incerta sem identificador continua exigindo conferência no provedor; não há botão de reenviar automaticamente. Backups preservam os registros de idempotência.

## Endpoints novos

- GET /router/capabilities, /router/installation
- POST /router/quit (desktop local), /router/biziva/check (catálogo somente)
- POST /router/password, /router/recovery-code (senha atual obrigatória)
- POST /router/recover (nome + código de uso único + nova senha; limitado)
- POST /router/backup e /router/restore (senha atual e senha do backup)
- GET /router/conversations; GET/PUT/DELETE /router/conversations/ID
- GET /router/operations, /router/operations/ID e /router/operations/ID/status

Todos exigem autenticação e isolamento por conta, exceto o reset que exige o código de recuperação. Mutações do navegador exigem mesma origem. Não há novas gerações pagas nos testes, certificação de provedores ou auditoria independente implícita.

Se houver queda exatamente durante a aquisição do bloqueio de inicialização, `desktop.start` pode permanecer. O aplicativo falha sem abrir o banco; o operador deve conferir que nenhum BizivaRouter está rodando antes de remover somente esse arquivo de bloqueio. Não apague o banco, `.env` ou a pasta inteira.
