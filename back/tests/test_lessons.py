from datetime import date

from app.lessons import PastGame, grade


def game(number: int, away: str, home: str, away_score: int, home_score: int, **extra) -> PastGame:
    return PastGame(
        game_id=f"g{number}",
        week=extra.pop("week", number),
        gameday=date(2026, 9, number),
        away=away,
        home=home,
        away_score=away_score,
        home_score=home_score,
        **extra,
    )


def test_better_record_loss_is_explained():
    played = [
        game(1, "BUF", "MIA", 30, 10),
        game(2, "MIA", "BUF", 24, 20),
        game(3, "KC", "DEN", 31, 10),
        game(4, "DEN", "KC", 21, 17),
    ]
    report = grade(played)
    record_misses = [miss for miss in report.misses if "récord" in miss.text]
    assert [miss.week for miss in record_misses] == [4, 2]
    assert report.pattern.startswith("El fallo que más se repite es confiar en el mejor récord")
    assert "pasó 2 veces" in report.pattern


def test_saved_forecast_is_what_gets_graded():
    history = game(1, "BUF", "MIA", 30, 10)
    saved = game(
        2,
        "MIA",
        "BUF",
        17,
        24,
        forecast_away=27,
        forecast_home=17,
        forecast_win_away=70,
        forecast_win_home=30,
    )
    report = grade([history, saved])
    assert report.hits == 0
    assert report.misses[0].source == "guardado"
    assert report.misses[0].text.startswith("Se proyectó 27-17")


def test_hot_streak_against_the_better_record():
    prior = [
        game(1, "BUF", "KC", 10, 20),
        game(2, "BUF", "DEN", 10, 20),
        game(3, "BUF", "NYJ", 10, 17),
        game(4, "BUF", "NE", 10, 17),
        game(5, "BUF", "CIN", 10, 17),
        game(6, "HOU", "BUF", 10, 24),
        game(7, "JAX", "BUF", 10, 24),
        game(8, "TEN", "BUF", 10, 24),
        game(9, "MIA", "DAL", 24, 10),
        game(10, "MIA", "PHI", 24, 10),
        game(11, "MIA", "NYG", 24, 10),
        game(12, "MIA", "CAR", 24, 10),
        game(13, "MIA", "ATL", 24, 10),
        game(14, "DAL", "MIA", 24, 10),
        game(15, "PHI", "MIA", 24, 10),
        game(16, "NYG", "MIA", 24, 10),
    ]
    target = game(
        17,
        "BUF",
        "MIA",
        10,
        24,
        week=9,
        forecast_away=27,
        forecast_home=17,
        forecast_win_away=68,
        forecast_win_home=32,
    )
    report = grade([*prior, target])
    found = next(miss for miss in report.misses if miss.week == 9)
    assert found.source == "guardado"
    assert "racha" in found.text
    assert "Buffalo" in found.matchup


def test_current_game_is_not_used_as_its_own_lesson():
    games = [game(day, "BUF", "MIA", 35, 7) for day in range(1, 5)]
    report = grade(games, exclude_id="g4")
    assert report.graded == 3
    assert all(miss.week != 4 for miss in report.misses)
    assert "g4" not in report.prompt


def test_bias_waits_for_four_games_then_corrects_the_home_side():
    short = grade([game(day, "KC", "DEN", 35, 7) for day in range(1, 4)])
    assert short.apply_margin == 0
    assert short.apply_total == 0
    pairs = [("KC", "DEN"), ("BUF", "MIA"), ("PHI", "DAL"), ("BAL", "CIN")]
    long = grade([game(day, away, home, 35, 7, week=day) for day, (away, home) in enumerate(pairs, start=1)])
    assert long.apply_margin == 4
    assert long.apply_total > 0
    assert "Bájale puntos al local" in long.prompt


def test_a_correct_pick_is_not_listed_as_a_miss():
    report = grade([game(1, "BUF", "MIA", 10, 30)])
    assert report.hits == 1
    assert report.misses == []
    assert report.pattern.startswith("En estos partidos el ganador")
