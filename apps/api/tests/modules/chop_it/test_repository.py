from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.modules.chop_it.infrastructure.models import User
from app.modules.chop_it.infrastructure.repository import ChopItRepository


def _session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    translated_engine = engine.execution_options(schema_translate_map={"chop_it": None})
    Base.metadata.create_all(translated_engine)
    with Session(translated_engine) as session:
        yield session


def _user(session: Session, display_name: str) -> User:
    user = User(display_name=display_name)
    session.add(user)
    session.flush()
    return user


def test_creates_shared_ingredient_and_recipe_with_macro_totals() -> None:
    with next(_session()) as session:
        user = _user(session, "Test cook")
        repository = ChopItRepository(session)
        category = repository.create_secondary_category(name="Carne")
        ingredient = repository.create_ingredient(
            name="Pollo",
            primary_macro_tag="protein",
            secondary_category_id=category.id,
            unit="g",
            kcal_per_100=120,
            protein_per_100=22,
            fat_per_100=3,
            carbs_per_100=0,
            actor_user_id=user.id,
        )

        recipe = repository.create_recipe(
            title="Pollo plancha",
            description="Simple",
            image_url=None,
            prep_time_minutes=15,
            servings=2,
            oil_mode="spray",
            oil_sprays=2,
            oil_grams=None,
            actor_user_id=user.id,
            ingredients=[{"ingredient_id": ingredient.id, "quantity": 300}],
        )

        recipes = repository.list_recipes()

    assert recipe.total_kcal == 378
    assert recipe.total_protein == 66
    assert recipe.total_fat == 11
    assert recipe.total_carbs == 0
    assert recipe.per_serving_kcal == 189
    assert [item.title for item in recipes] == ["Pollo plancha"]


def test_oil_ingredient_controls_recipe_oil_spray_reference() -> None:
    with next(_session()) as session:
        user = _user(session, "Test cook")
        repository = ChopItRepository(session)
        category = repository.create_secondary_category(name="Grasa")
        oil = repository.create_ingredient(
            name="Aceite de oliva",
            primary_macro_tag="fat",
            secondary_category_id=category.id,
            unit="g",
            kcal_per_100=884,
            protein_per_100=0,
            fat_per_100=100,
            carbs_per_100=0,
            grams_per_spray=0.25,
            actor_user_id=user.id,
        )

        recipe = repository.create_recipe(
            title="Ensalada",
            description="",
            image_url=None,
            prep_time_minutes=5,
            servings=1,
            oil_mode="spray",
            oil_sprays=2,
            oil_grams=None,
            actor_user_id=user.id,
            ingredients=[],
        )
        repository.update_ingredient(
            oil.id,
            name="Aceite de oliva",
            primary_macro_tag="fat",
            secondary_category_id=category.id,
            unit="g",
            kcal_per_100=884,
            protein_per_100=0,
            fat_per_100=100,
            carbs_per_100=0,
            grams_per_spray=0.5,
            actor_user_id=user.id,
        )

    assert oil.is_oil is True
    assert oil.grams_per_spray == 0.5
    assert recipe.total_kcal == 8.84
    assert recipe.total_fat == 1


def test_archived_recipe_is_hidden_and_plan_assignments_are_removed() -> None:
    with next(_session()) as session:
        user = _user(session, "Test cook")
        repository = ChopItRepository(session)
        category = repository.create_secondary_category(name="Grano")
        ingredient = repository.create_ingredient(
            name="Arroz",
            primary_macro_tag="carb",
            secondary_category_id=category.id,
            unit="g",
            kcal_per_100=360,
            protein_per_100=7,
            fat_per_100=1,
            carbs_per_100=78,
            actor_user_id=user.id,
        )
        recipe = repository.create_recipe(
            title="Arroz",
            description="Base",
            image_url=None,
            prep_time_minutes=20,
            servings=4,
            oil_mode="none",
            oil_sprays=None,
            oil_grams=None,
            actor_user_id=user.id,
            ingredients=[{"ingredient_id": ingredient.id, "quantity": 400}],
        )
        repository.upsert_meal_plan_item(
            owner_user_id=user.id,
            meal_date="2026-06-08",
            meal_slot="lunch",
            recipe_id=recipe.id,
            servings=1,
        )

        repository.archive_recipe(recipe.id, actor_user_id=user.id)

        assert repository.list_recipes() == []
        assert [archived.title for archived in repository.list_archived_recipes()] == ["Arroz"]
        assert repository.list_week_plan_items(owner_user_id=user.id, week_start="2026-06-08") == []


def test_user_owned_plans_and_current_lists_are_isolated_by_owner() -> None:
    with next(_session()) as session:
        first_user = _user(session, "first@example.com")
        second_user = _user(session, "second@example.com")
        repository = ChopItRepository(session)
        category = repository.create_secondary_category(name="Lacteo")
        ingredient = repository.create_ingredient(
            name="Yogur",
            primary_macro_tag="protein",
            secondary_category_id=category.id,
            unit="g",
            kcal_per_100=80,
            protein_per_100=10,
            fat_per_100=2,
            carbs_per_100=5,
            actor_user_id=first_user.id,
        )
        recipe = repository.create_recipe(
            title="Yogur",
            description="Bowl",
            image_url=None,
            prep_time_minutes=5,
            servings=1,
            oil_mode="none",
            oil_sprays=None,
            oil_grams=None,
            actor_user_id=first_user.id,
            ingredients=[{"ingredient_id": ingredient.id, "quantity": 200}],
        )
        repository.upsert_meal_plan_item(
            owner_user_id=first_user.id,
            meal_date="2026-06-08",
            meal_slot="breakfast",
            recipe_id=recipe.id,
            servings=1,
        )
        first_list = repository.create_shopping_list(
            owner_user_id=first_user.id,
            title="Semana 24",
            start_date="2026-06-08",
            end_date="2026-06-14",
            items=[
                {
                    "ingredient_id": ingredient.id,
                    "section": "missing",
                    "required_quantity": 200,
                    "pantry_quantity": 0,
                    "final_quantity": 200,
                    "is_checked": False,
                    "source_json": {"recipes": [recipe.id]},
                }
            ],
        )
        repository.create_shopping_list(
            owner_user_id=second_user.id,
            title="Otra semana",
            start_date="2026-06-08",
            end_date="2026-06-14",
            items=[],
        )

        first_items = repository.list_week_plan_items(
            owner_user_id=first_user.id,
            week_start="2026-06-08",
        )
        second_items = repository.list_week_plan_items(
            owner_user_id=second_user.id,
            week_start="2026-06-08",
        )
        current_first = repository.get_current_shopping_list(owner_user_id=first_user.id)
        current_second = repository.get_current_shopping_list(owner_user_id=second_user.id)

    assert [item.recipe_id for item in first_items] == [recipe.id]
    assert second_items == []
    assert current_first is not None
    assert current_first.id == first_list.id
    assert current_second is not None
    assert current_second.owner_user_id == second_user.id
