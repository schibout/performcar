---
name: suivi-devis-easydevis
description: Retrouver, résumer et faire évoluer les devis EasyDevis (recherche, détail, statut, indicateurs de la concession).
version: 1.0.0
metadata:
  hermes:
    tags: [performcar, devis, suivi, statistiques]
    category: performcar
    requires_tools: [mcp_easydevis_lister_devis]
---

# Suivi des devis

## When to Use
« Où en est le devis de M. Dupont ? », « mes devis de la semaine », « passe le devis en confirmé »,
« combien de devis ce mois-ci ? », « quel est notre taux de conversion ? ».

## Procedure
- **Rechercher** : `lister_devis` (recherche par référence, client ou véhicule ; filtres statut et période
  `today`, `week`, `month`). Présente au plus 10 lignes : référence, client, véhicule, total, statut, date.
- **Détailler** : `consulter_devis` avec l'`id`.
- **Statuts** : `pending` = en attente, `confirmed` = confirmé, `completed` = réalisé.
  Pour changer : récapitule (référence, ancien → nouveau statut), attends un « oui », puis `changer_statut_devis`.
- **Indicateurs** : `statistiques_devis` → total, répartition par statut, chiffre d'affaires,
  panier moyen, taux de conversion, mois en cours vs précédent, 6 derniers mois.
  Résume en 3 à 5 phrases avec les chiffres clés.

## Pitfalls
- L'assistant ne voit que les devis de **sa** concession.
- Aucune suppression possible depuis l'assistant : orienter vers l'application EasyDevis.
- Ne modifie pas le contenu d'un devis (véhicule, prestations) : cela se fait dans EasyDevis
  (« Modifier le devis »), où les prix déjà figés sont conservés.

## Verification
Après un changement de statut, relis le devis avec `consulter_devis` et confirme le nouveau statut.
