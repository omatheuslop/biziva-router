# Seu primeiro uso / First use

[English README](../README.md) · [Português](README.pt-BR.md) · [Exemplos](recipes.md)

## 1. Escolha o download

Use os arquivos de [v0.3.1](https://github.com/omatheuslop/biziva-router/releases/tag/v0.3.1): Windows x64 `.exe`, Mac Apple Silicon `.dmg` ou Linux x64 `.tar.gz`. O Node já está incluído. Mac Intel ainda não tem pacote; a alternativa pelo código requer Node 24+. Confira o arquivo com `SHA256SUMS.txt` da mesma versão.

Os pacotes são prévias: Windows sem assinatura de editor e Mac sem notarização Apple. Se o sistema bloquear, não desligue suas proteções. Use o caminho pelo código-fonte do README ou aguarde um pacote assinado. No Linux, extraia o arquivo e execute o binário dentro da pasta. O painel abre no navegador local; precisa de Internet para chamar seu provedor.

## 2. Crie seu acesso local

Abra o aplicativo e siga o primeiro acesso. Escolha nome e senha de pelo menos 10 caracteres. O cadastro é desta instalação, não uma conta hospedada. Guarde seus dados locais e chave mestra; não recrie a chave mestra ao atualizar. Fechar a aba não encerra necessariamente o processo do Router.

## 3. Conecte a sua IA

Em **Minhas chaves**, escolha o provedor da sua própria conta e salve a chave. A chave do provedor e o código de integração do Router são diferentes. Assinaturas de ChatGPT/Claude não incluem automaticamente créditos de API. Para Biziva API, use sua própria chave do [console](https://api.biziva.com.br/console).

Em **Rotas e economia**, informe o modelo exato liberado na sua conta, tarefa e preços do seu contrato. Aprove apenas modelos que você validou para aquela tarefa. Metadados do catálogo não são aprovação de qualidade. Comece com **Modelo fixo**.

## 4. Faça uma primeira tarefa pequena

No Chat, tente: “Resuma este texto em três tópicos: Nossa equipe atende de segunda a sexta, das 9h às 18h. Pedidos recebidos após esse horário serão respondidos no próximo dia útil.”

Clique em **Simular sem gastar**. A simulação não chama o provedor. Confira modelo e estimativa; ela não é um teto de fatura. Confirme o envio pago somente se quiser consumir sua API. O resultado esperado é um resumo em três tópicos; o texto exato depende do modelo. Em **Consumo**, confira chamadas e custos conhecidos. Custo desconhecido não significa grátis.

## Se algo impedir o primeiro uso

| Situação | Próximo passo |
| --- | --- |
| Painel não abriu | Verifique se o aplicativo continua rodando e abra o endereço local exibido por ele. Não publique a porta na Internet. |
| Chave recusada | Confira provedor, saldo, acesso ao modelo e chave na sua própria conta; não cole a chave em uma issue. |
| Nenhuma rota aprovada | Cadastre e aprove uma rota compatível para a tarefa selecionada. |
| Resultado incerto/timeout | Consulte a operação original; não reenvie automaticamente uma geração que pode ter sido cobrada. |
| Não gostei da resposta | Revise instrução e modelo. Cada nova geração pode ter custo; menor preço não garante qualidade equivalente. |
| Preciso de ajuda | [Abra um relato](https://github.com/omatheuslop/biziva-router/issues/new/choose) com sistema, versão e passos usando dados fictícios. |

## English quick path

Download your OS package from the release above. Create a local account, save your own provider API key, approve an exact model and its price, and start with the fixed-model profile. Preview a short request for free before explicitly confirming a paid generation. Check the usage page afterwards. The software is free; provider usage is separate. Packages are unsigned/not notarized previews; do not disable OS protections. See the [full quickstart](quickstart.md) for SDK setup and troubleshooting.
