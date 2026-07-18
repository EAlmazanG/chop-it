from datetime import date, timedelta

from app.db.session import SessionLocal
from app.modules.chop_it.api.router import DEMO_USER_ID
from app.modules.chop_it.application.services import ChopItService
from app.modules.chop_it.infrastructure.repository import ChopItRepository


def seed_catalog() -> dict[str, str]:
    with SessionLocal() as session:
        repository = ChopItRepository(session)
        categories = {item.name: item for item in repository.list_secondary_categories()}
        for name in ("Proteínas", "Verduras", "Cereales", "Grasas", "Lácteos", "Fruta"):
            if name not in categories:
                categories[name] = repository.create_secondary_category(name=name)

        ingredient_specs = (
            ("Pechuga de pollo", "protein", "Proteínas", "g", 120, 22, 3, 0, None),
            ("Arroz integral", "carb", "Cereales", "g", 360, 8, 3, 75, None),
            ("Tomate", "carb", "Verduras", "g", 18, 0.9, 0.2, 3.9, None),
            ("Espinacas", "carb", "Verduras", "g", 23, 2.9, 0.4, 3.6, None),
            ("Aguacate", "fat", "Grasas", "g", 160, 2, 15, 9, None),
            ("Yogur griego", "protein", "Lácteos", "g", 97, 9, 5, 4, None),
            ("Copos de avena", "carb", "Cereales", "g", 389, 17, 7, 66, None),
            ("Plátano", "carb", "Fruta", "g", 89, 1.1, 0.3, 23, None),
            ("Aceite de oliva", "fat", "Grasas", "g", 884, 0, 100, 0, 1.0),
        )
        ingredients = {item.name: item for item in repository.list_ingredients()}
        for name, macro, category, unit, kcal, protein, fat, carbs, spray in ingredient_specs:
            if name not in ingredients:
                ingredients[name] = repository.create_ingredient(
                    name=name,
                    primary_macro_tag=macro,
                    secondary_category_id=categories[category].id,
                    unit=unit,
                    kcal_per_100=kcal,
                    protein_per_100=protein,
                    fat_per_100=fat,
                    carbs_per_100=carbs,
                    grams_per_spray=spray,
                    actor_user_id=DEMO_USER_ID,
                )

        recipe_specs = (
            (
                "Bowl mediterráneo",
                "Pollo, arroz integral y verduras para una comida completa.",
                30,
                2,
                "spray",
                4,
                None,
                (
                    ("Pechuga de pollo", 320),
                    ("Arroz integral", 180),
                    ("Tomate", 180),
                    ("Espinacas", 100),
                ),
            ),
            (
                "Avena con yogur y plátano",
                "Desayuno rápido, cremoso y fácil de preparar con antelación.",
                10,
                2,
                "none",
                None,
                None,
                (("Copos de avena", 120), ("Yogur griego", 250), ("Plátano", 180)),
            ),
            (
                "Ensalada verde con aguacate",
                "Una cena ligera con hojas verdes, tomate y aguacate.",
                12,
                2,
                "grams",
                None,
                8,
                (("Espinacas", 180), ("Tomate", 220), ("Aguacate", 160)),
            ),
        )
        recipes = {item.title: item for item in repository.list_recipes()}
        for title, description, prep, servings, oil_mode, sprays, grams, items in recipe_specs:
            if title not in recipes:
                recipes[title] = repository.create_recipe(
                    title=title,
                    description=description,
                    image_url=None,
                    prep_time_minutes=prep,
                    servings=servings,
                    oil_mode=oil_mode,
                    oil_sprays=sprays,
                    oil_grams=grams,
                    actor_user_id=DEMO_USER_ID,
                    ingredients=[
                        {"ingredient_id": ingredients[name].id, "quantity": quantity}
                        for name, quantity in items
                    ],
                )
        session.commit()
        return {title: recipe.id for title, recipe in recipes.items()}


def seed_current_week(recipes: dict[str, str]) -> None:
    service = ChopItService()
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    if service.list_week_plan(owner_user_id=DEMO_USER_ID, week_start=monday).items:
        return
    assignments = (
        (0, "breakfast", "Avena con yogur y plátano"),
        (0, "lunch", "Bowl mediterráneo"),
        (1, "dinner", "Ensalada verde con aguacate"),
        (2, "lunch", "Bowl mediterráneo"),
        (3, "breakfast", "Avena con yogur y plátano"),
    )
    for day_offset, slot, title in assignments:
        service.create_meal_plan_item(
            owner_user_id=DEMO_USER_ID,
            meal_date=monday + timedelta(days=day_offset),
            meal_slot=slot,
            recipe_id=recipes[title],
            servings=1,
        )


def main() -> None:
    seed_current_week(seed_catalog())


if __name__ == "__main__":
    main()
