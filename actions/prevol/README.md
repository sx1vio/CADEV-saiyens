# Action GitHub : DevHub Pré-vol

Contrôle de code gratuit (installation, `lint`, `typecheck`, `test`, `build`) puis pré-vol DevHub : sécurité, réseau 3G, dépendances vulnérables et licences. Le rapport s'affiche dans le résumé du job.

```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with: { node-version: 22 }
- uses: sx1vio/CADEV-saiyens/actions/prevol@main
  with:
    token: ${{ secrets.DEVHUB_TOKEN }}
    url: https://monapp.sn
```

Entrées, sorties et serveur MCP : voir [`docs/guides/prevol.md`](../../docs/guides/prevol.md).
