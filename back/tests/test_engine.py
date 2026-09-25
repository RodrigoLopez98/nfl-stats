from app.engine import (
    PlayedGame,
    Record,
    assign_ranks,
    historical_over_pct,
    is_counted_game,
    pick_over_under,
    pick_trend,
    project_total,
    winner_by_ranks,
    winner_by_record,
)


def test_better_record_uses_wins_then_losses():
    assert winner_by_record(Record("GREEN BAY", 4, 1), Record("PITTSBURGH", 4, 2)) == "GREEN BAY"
    assert winner_by_record(Record("DALLAS", 3, 1), Record("DENVER", 5, 2)) == "DENVER"
    assert winner_by_record(Record("BUFFALO", 4, 2), Record("CAROLINA", 4, 2)) == "EMPATE"


def test_projection_matches_excel_over_rule():
    assert project_total(18.3, 20) == 38.3
    assert pick_over_under(49.3, 49) == "OVER"
    assert pick_over_under(38.3, 44.5) == "UNDER"
    assert pick_over_under(47, 47) == "UNDER"


def test_historical_over_ignores_missing_games_and_uses_current_line():
    games = [PlayedGame(20, 13), PlayedGame(22, 27)]
    assert historical_over_pct(games, 47) == 0.5
    assert historical_over_pct([], 47) is None
    assert pick_trend(0.5) == "UNDER"
    assert pick_trend(0.67) == "OVER"


def test_bye_is_not_a_counted_game():
    assert is_counted_game("REG", 20, 13) is True
    assert is_counted_game("REG", None, None) is False
    assert is_counted_game("PRE", 10, 7) is False


def test_higher_rank_number_is_worse_and_ties_do_not_score():
    ranks = assign_ranks(
        {
            "A": {"points": 30, "sacks": 1},
            "B": {"points": 10, "sacks": 5},
            "C": {"points": 30, "sacks": 5},
        }
    )
    assert ranks["A"]["points"] == 1
    assert ranks["C"]["points"] == 1
    assert ranks["B"]["points"] == 3
    assert ranks["A"]["sacks"] == 3
    pick, away_wins, home_wins, _detail = winner_by_ranks("A", ranks["A"], "B", ranks["B"])
    assert (pick, away_wins, home_wins) == ("EMPATE", 1, 1)
    pick, away_wins, home_wins, _detail = winner_by_ranks("C", ranks["C"], "B", ranks["B"])
    assert pick == "C"
    assert away_wins > home_wins
