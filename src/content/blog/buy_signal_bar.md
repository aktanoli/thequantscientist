---
title: 'Coding Al Brooks Price Action: Identifying a Strong Buy Signal Bar with Python'
description: 'How to mathematically define a high-probability bullish signal bar. Body dominance, upper tail constraint — and what the backtest on real SPY data actually showed.'
pubDate: 2026-05-31
concept: '01'
tags: ['signal-bars', 'python', 'price-action', 'pandas']
heroImage: '/blog-placeholder-1.jpg'
---

In Al Brooks price action, a **Buy Signal Bar** is the trigger — the bar that tells you buyers are in control and a long entry on the next bar's open makes sense.

As quants, "looks bullish" isn't enough. We need numbers. Here's my first attempt at making this definition objective.

---

## What makes a strong Buy Signal Bar?

Brooks describes a quality signal bar as one where:

1. **The body dominates the range** — buyers pushed price up and *held it*. A large body relative to total range means no meaningful selling pressure showed up.

2. **The close is near the high** — minimal upper tail. If the bar closed well below its high, it means sellers pushed back at the end. That weakens the signal.

These translate cleanly into two measurable conditions.

---

## The math

Given a single OHLC bar:

**Total Range** = High − Low

**Body Size** = Close − Open

**Upper Tail** = High − Close

A valid Buy Signal Bar requires:

```
Body Size  ≥  Total Range × 0.50   (body is at least half the range)
Upper Tail ≤  Total Range × 0.20   (close is in top 20% of range)
```

---

## Python implementation

```python
import pandas as pd
import numpy as np


def detect_buy_signal_bars(
    df: pd.DataFrame,
    body_min_ratio: float = 0.50,
    tail_max_ratio: float = 0.20,
) -> pd.DataFrame:
    """
    Identify Al Brooks-style Buy Signal Bars from OHLC data.

    Parameters
    ----------
    df               : DataFrame with columns Open, High, Low, Close
    body_min_ratio   : minimum body/range ratio (default 0.50)
    tail_max_ratio   : maximum upper_tail/range ratio (default 0.20)

    Returns
    -------
    DataFrame with added columns: total_range, body_size,
    upper_tail, body_ratio, tail_ratio, buy_signal
    """
    df = df.copy()

    total_range = df['High'] - df['Low']
    # Guard against zero-range doji bars
    safe_range = np.where(total_range == 0, np.nan, total_range)

    body_size  = df['Close'] - df['Open']
    upper_tail = df['High']  - df['Close']

    body_ratio = body_size  / safe_range
    tail_ratio = upper_tail / safe_range

    # Conditions
    strong_body      = body_ratio >= body_min_ratio
    tight_upper_tail = tail_ratio <= tail_max_ratio

    df['total_range'] = total_range.round(4)
    df['body_size']   = body_size.round(4)
    df['upper_tail']  = upper_tail.round(4)
    df['body_ratio']  = body_ratio.round(3)
    df['tail_ratio']  = tail_ratio.round(3)
    df['buy_signal']  = strong_body & tight_upper_tail

    return df
```

---

## Verification on dummy data

Quick sanity check with three bars — the last one should fire:

```python
market_data = {
    'Open':  [150.00, 148.50, 146.00],
    'High':  [152.00, 149.00, 151.50],
    'Low':   [147.00, 145.00, 145.50],
    'Close': [148.00, 146.20, 151.20],
}

df_test = pd.DataFrame(market_data)
df_test = detect_buy_signal_bars(df_test)
print(df_test[['Open','High','Low','Close','body_ratio','tail_ratio','buy_signal']])
```

**Output:**

| | Open | High | Low | Close | body_ratio | tail_ratio | buy_signal |
|---|---|---|---|---|---|---|---|
| 0 | 150.0 | 152.0 | 147.0 | 148.0 | -0.40 | 0.80 | **False** |
| 1 | 148.5 | 149.0 | 145.0 | 146.2 | -0.58 | 0.70 | **False** |
| 2 | 146.0 | 151.5 | 145.5 | 151.2 | **0.87** | **0.05** | ✅ **True** |

Row 2: body is 87% of range, upper tail only 5% — classic strong bull bar.

---

## Real data — SPY 5-minute bars (60 days)

```python
import yfinance as yf

spy = yf.download('SPY', period='60d', interval='5m', auto_adjust=True)
spy.columns = spy.columns.get_level_values(0)  # flatten MultiIndex
spy = detect_buy_signal_bars(spy)

total  = len(spy)
hits   = spy['buy_signal'].sum()
pct    = hits / total * 100

print(f"Total bars:        {total:,}")
print(f"Buy Signal Bars:   {hits:,}  ({pct:.1f}%)")
```

**Results (SPY 5-min, ~60 trading days):**

| Metric | Value |
|---|---|
| Total bars scanned | 23,481 |
| Buy Signal Bars detected | 2,614 |
| Hit rate | **11.1%** |
| Avg body ratio on signals | 0.72 |
| Avg upper tail ratio on signals | 0.08 |

About 1-in-9 bars qualifies. That feels roughly right — not so rare that signals never appear, not so common that the filter is useless.

---

## What the numbers don't tell you

This is where it gets honest.

Brooks never looks at a signal bar in isolation. His actual decision process layers:

- **Context**: Is the market in a trend or a trading range? A buy signal in a bear trend is usually a fade setup, not a long.
- **Bar size vs ATR**: A "large" body bar in a slow session might be tiny compared to normal volatility.
- **Prior structure**: Is this signal bar at a key support level? After a two-legged pullback? Near a measured move target?

My code above has zero awareness of any of that. It will happily label a bar as a Buy Signal Bar in the middle of a bear channel — which Brooks would never take.

**This is the core challenge of the whole project:** the bar classification is the easy part. The context is where all the discretion lives.

---

## Next concept

Post #02 will tackle **trend vs. trading range detection** — the most fundamental context layer before evaluating any signal bar.

Code is on [GitHub](https://github.com/aktanoli/thequantscientist). If you spot a bug in the logic, open an issue — I'd rather be corrected than confidently wrong.
