---
name: creer-devis-easydevis
description: Établir un devis PERFORM'CAR dans EasyDevis par la conversation (véhicule, prestations, financement, client), avec récapitulatif et confirmation avant création.
version: 1.0.0
metadata:
  hermes:
    tags: [performcar, devis, easydevis, vente]
    category: performcar
    requires_tools: [mcp_easydevis_creer_devis, mcp_easydevis_lister_prestations]
required_environment_variables:
  - name: EASYDEVIS_SERVICE_KEY
    prompt: Clé de service EasyDevis (ASSISTANT_SERVICE_KEY du backend)
    help: Les outils agissent au nom de l'utilisateur connecté grâce au ticket de conversation.
    required_for: création et lecture des devis
---

# Créer un devis EasyDevis

## When to Use
L'utilisateur veut un devis, un chiffrage ou « un prix » pour un véhicule et des prestations
(PPF XPEL, céramique, vitres teintées, pare-brise, etc.).

## Procedure
Collecte les informations **dans l'ordre du parcours EasyDevis**, une question à la fois,
en reprenant ce que l'utilisateur a déjà donné.

1. **Véhicule** — appelle `catalogue_vehicules` puis fais choisir :
   marque, modèle, version (facultative), année (2000 à l'année prochaine), couleur, état (neuf `new` / occasion `used`).
   Utilise les libellés exacts du catalogue. Si le véhicule n'y figure pas, dis-le et propose
   de signaler l'ajout au catalogue à un administrateur.
2. **Prestations** — appelle `lister_prestations`. Propose celles qui répondent au besoin
   (voir la compétence `conseil-protection-xpel`), avec leur **prix catalogue**.
   Garde les `id` choisis (au moins une prestation). Annonce le total TTC (somme des prix).
3. **Financement** — comptant (`cash`), crédit (`credit`), LOA (`leasing_loa`) ou LLD (`leasing_lld`).
   Hors comptant : apport (0 à total) et durée (12, 24, 36, 48 ou 60 mois ; 1 à 120 acceptés).
   Appelle `simuler_financement` pour annoncer la mensualité.
4. **Client** — appelle `rechercher_clients` avec le nom ou le téléphone.
   Si un client correspond, fais confirmer son identité et garde son `id`.
   Sinon collecte prénom, nom (lettres, espaces, tirets, apostrophes ; 2 à 100 caractères),
   téléphone français (0X XX XX XX XX ou +33…) et e-mail facultatifs.
   Date souhaitée facultative (AAAA-MM-JJ, pas dans le passé).
5. **Récapitulatif** — présente : véhicule, prestations et prix, total, financement et mensualité,
   client, date souhaitée. Demande : « Je crée ce devis ? »
6. **Création** — uniquement après un « oui » explicite : `creer_devis`.
   Communique la **référence** (QUO-AAAAMMJJ-NNNN), le total et la mensualité renvoyés par EasyDevis.

## Pitfalls
- Ne jamais chiffrer avec les tarifs « à partir de » du site : seul le catalogue fait foi.
- Erreurs EasyDevis fréquentes (champ `erreur`) :
  - `error.quote.no_dealership` : l'utilisateur connecté n'est rattaché à aucune concession (cas d'un administrateur) → l'expliquer et l'orienter vers l'administration.
  - `error.quote.down_payment_too_high` : apport supérieur au total.
  - `error.quote.financing_incomplete` : durée manquante hors comptant.
  - `error.catalog.service_unavailable` : prestation désactivée, la retirer.
  - `VALIDATION_ERROR` : lire `details`, corriger le champ et redemander à l'utilisateur.
- Un client existant réutilisé avec des coordonnées modifiées est mis à jour par EasyDevis : le signaler.

## Verification
Après création, `consulter_devis` avec l'`id` renvoyé et vérifie que le total et la mensualité
correspondent à ce qui a été annoncé.
