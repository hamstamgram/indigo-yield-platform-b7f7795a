
Objectif: éliminer le “fantôme” entre le ledger et l’UI en traitant le problème comme 2 bugs distincts mais liés:
1. source AUM incohérente côté UI
2. diagnostic de void trop opaque côté mutation/RPC

Constats du code actuel
- Le void admin passe par `VoidTransactionDialog.tsx` → `useTransactionMutations()` → `adminTransactionHistoryService.voidTransaction()` → RPC `void_transaction