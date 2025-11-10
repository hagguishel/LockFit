# 🏋️‍♂️ LockFit – Résultats et leçons apprises

## 1. Contexte du projet

LockFit est une application mobile de musculation conçue pour accompagner les utilisateurs dans le suivi de leurs entraînements, la gestion de leurs progrès et la découverte d’exercices adaptés à tous les niveaux. Elle intègre une authentification multi-facteurs (MFA) afin de garantir un accès sécurisé aux comptes utilisateurs et d’assurer une protection complète des données personnelles.

Le projet a été développé avec React Native (via Expo) pour la partie mobile, et avec NestJS, Prisma et PostgreSQL pour la partie serveur. L’objectif fixé dès le départ était la livraison d’un **MVP complet et fonctionnel**, permettant de tester toutes les fonctionnalités essentielles de l’application dans un environnement réaliste, tout en garantissant un haut niveau de sécurité et de stabilité.

---

## 2. Résultats du projet

Le MVP de LockFit a atteint avec succès les objectifs définis dans la charte du projet. L’équipe a réussi à concevoir et livrer une application mobile pleinement fonctionnelle, dotée d’une architecture solide et d’un backend sécurisé.

Les principales fonctionnalités livrées incluent la création et la connexion de comptes utilisateurs grâce à un système d’authentification basé sur JWT, l’intégration d’une authentification multi-facteurs via TOTP et Passkeys, la gestion complète du profil utilisateur, la consultation d’un catalogue d’exercices, ainsi que le suivi de la progression au fil des séances.

L’infrastructure backend s’appuie sur NestJS et Prisma pour offrir une base de données stable et performante. La sécurité a été renforcée par l’utilisation d’Argon2 pour le hachage des mots de passe, de Helmet pour la protection des en-têtes HTTP, et d’une stratégie JWT bien structurée pour la gestion des sessions. Côté interface, l’application mobile développée avec Expo et React Native s’est révélée fluide, intuitive et adaptée à l’expérience utilisateur visée.

Le périmètre du MVP se concentre exclusivement sur les fonctionnalités essentielles liées à la progression et à la sécurité des utilisateurs. Le module social, qui permettra dans une version future de partager les résultats entre utilisateurs, ne faisait pas partie du périmètre initial et sera ajouté ultérieurement dans la version LockFit 2.0.

---

## 3. Ce qui a bien fonctionné

L’un des points forts du projet a été la clarté de l’architecture dès les premières étapes. La séparation entre le frontend, le backend et la base de données a permis d’éviter les confusions et de garantir une évolution fluide du code. L’intégration des aspects de sécurité a également été particulièrement réussie : le hachage des mots de passe, la mise en place du MFA et la gestion des tokens JWT ont été correctement implémentés et testés.

La communication au sein de l’équipe a constitué un autre atout majeur. Chaque membre savait précisément quelles étaient ses responsabilités, et les décisions techniques étaient toujours validées collectivement, ce qui a permis de limiter les erreurs. Enfin, la gestion du projet par sprints et la priorisation des tâches ont assuré une progression régulière et un respect du calendrier global.

---

## 4. Difficultés rencontrées

Comme dans tout projet de développement, plusieurs défis techniques et organisationnels ont été rencontrés. La configuration initiale de Prisma et de la base de données PostgreSQL a pris plus de temps que prévu, notamment en raison de la mise en place de l’environnement Docker. Cette phase a nécessité plusieurs ajustements pour garantir une stabilité suffisante avant de pouvoir avancer sur le développement fonctionnel.

Une autre difficulté est apparue lors de la synchronisation entre le backend et le frontend. Certaines routes de l’API n’étaient pas encore disponibles lorsque les premières interfaces mobiles ont été testées, ce qui a retardé l’intégration. Enfin, la phase de tests s’est avérée relativement dense, avec un grand nombre de scénarios à valider manuellement en l’absence d’automatisation.

---

## 5. Solutions apportées

Afin de surmonter ces obstacles, l’équipe a mis en place des réunions de synchronisation hebdomadaires. Ces moments d’échange ont permis de résoudre les blocages techniques rapidement et d’assurer un alignement constant entre les différentes parties du projet. Des outils comme Postman ont été utilisés pour tester les endpoints du backend de manière indépendante, ce qui a facilité la communication entre les développeurs frontend et backend.

Le développement a également été organisé de façon progressive : les endpoints critiques, notamment ceux liés à l’authentification et à la gestion des utilisateurs, ont été livrés en priorité, avant les modules secondaires comme le catalogue d’exercices ou le suivi des performances. Cette approche itérative a permis de livrer un produit fonctionnel à chaque étape tout en sécurisant la qualité du code.

---

## 6. Leçons apprises

Le projet LockFit a permis de tirer plusieurs enseignements précieux. L’un des plus marquants est l’importance d’une architecture claire et documentée dès les premières semaines du développement. Cette rigueur initiale a évité de nombreux retards par la suite. Le choix d’adopter dès le début les bonnes pratiques de sécurité et de structuration des données s’est également révélé payant, car il a permis d’éviter les problèmes d’intégration et de compatibilité entre les différents modules.

Sur le plan organisationnel, l’équipe a pris conscience de la nécessité d’intégrer les tests plus tôt dans le cycle de développement. Les validations manuelles en fin de projet ont demandé beaucoup de temps et auraient pu être allégées grâce à des tests automatisés. L’expérience a aussi montré l’intérêt de mettre en place une intégration continue (CI/CD) afin de fluidifier les déploiements et d’éviter les divergences d’environnements entre les machines locales.

Enfin, la gestion du temps constitue un autre point de réflexion. Certaines tâches techniques, notamment la configuration initiale de Docker et de Prisma, ont été sous-estimées dans la planification. Ce constat servira de repère pour les projets futurs afin d’améliorer l’estimation des charges de travail.

---

## 7. Rétrospective d’équipe

Lors de la rétrospective finale, l’équipe a mis en avant la bonne cohésion du groupe et la qualité de la collaboration entre les membres. L’entraide technique et la rigueur dans l’implémentation des mesures de sécurité ont été saluées par tous. En revanche, la gestion du temps et la coordination des phases de test ont été identifiées comme des axes d’amélioration. Pour les futurs projets, l’équipe envisage de mettre en place des tests automatisés, de simplifier la configuration locale des environnements et de mieux anticiper les périodes de validation fonctionnelle.

---

## 8. Conclusion

Le projet LockFit a été une réussite sur le plan technique comme organisationnel. L’équipe a su concevoir, développer et livrer un MVP complet, stable et sécurisé, fidèle à la vision initiale. Ce projet a permis à chacun de renforcer ses compétences dans des domaines variés tels que la sécurité applicative, la conception d’API RESTful professionnelles, la gestion d’une base de données relationnelle moderne et la coordination d’un projet complet en mode agile.

Le parcours de LockFit illustre la capacité du groupe à transformer une idée en un produit concret et viable. Cette expérience servira de fondation solide pour les prochaines évolutions de LockFit ainsi que pour d’autres projets professionnels à venir.
