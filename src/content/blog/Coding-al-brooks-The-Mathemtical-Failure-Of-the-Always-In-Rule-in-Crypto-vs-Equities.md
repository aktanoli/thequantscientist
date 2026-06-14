---
title: "Coding Al Brooks: The Mathematical Failure of the Always-In Rule in Crypto vs. Equities"
description: "What happens when you convert Al Brooks' Always-In Long and Always-In Short framework into a systematic Python engine and benchmark it across Bitcoin and the S&P 500? The data shows where the idea holds up, where it breaks down, and why market structure matters."
pubDate: 2026-06-11
concept: "04"
tags:
    - al-brooks
    - always-in
    - python
    - crypto
    - bitcoin (BTC)
    - us Equities backtesting
    - sp500
    - price-action
---

# Coding Al Brooks: The Mathematical Failure of the "Always-In" Rule in Crypto vs. Equities

If you have been following my ongoing Al Brooks series, you already know that reading price delivery bar-by-bar is the closest thing to understanding institutional psychology. We have covered Signal Bars, Trading Ranges, and Wyckoffian Traps.

But today, we are testing the holy grail of Brooks' trend management framework: the Always-In Long ($AIL$) vs. Always-In Short ($AIS$) state.

Al Brooks famously states that at any given second, the market possesses a definitive directional bias. If you were forced to always hold a position in the market, either long or short, the direction you choose is your "Always-In" state.

Gurus on YouTube tell you to use indicators like MACD, RSI, or Supertrend to find the macro direction. Brooks rejects this completely. He claims you can find the institutional pulse purely by tracking consecutive strong trend bars on a naked chart.

As always on The Quant Scientist, we do not buy into theories or marketing hype. We turned the Always-In logic into a systematic Python state engine, backtested it across two entirely different asset classes, Bitcoin (Crypto) and the S&P 500 (Equities), and discovered a brutal structural truth about trend-following systems.

## The Core Logic: How to Define "Always-In" Mathematically

To code an Al Brooks Always-In engine, we have to convert subjective visual bar descriptions into strict, binary mathematical constraints: $1$ for Long and $-1$ for Short.

According to Brooks, a market shifts its state when institutions aggressively step in, printing consecutive trend bars that break prior structural high or low boundaries.

```text
[10-Bar Range] -> [Two Consecutive Strong Bull Bars Close Above Range] -> State Flips to Always-In Long (+1)
```

Here is exactly how we translated this logic inside our looping backtest engine:

- Trend Bar Validation: A candle cannot just be any random candle. It is only classified as a "Strong Trend Bar" if its closing price is located within the top $25\%$ for bulls or bottom $25\%$ for bears of its absolute high-low range.
- State Flip to Long ($AIL$): Triggered when two consecutive strong bull bars print, and the second bar closes completely above the highest high of the last 10 periods.
- State Flip to Short ($AIS$): Triggered when two consecutive strong bear bars print, and the second bar closes completely below the lowest low of the last 10 periods.

## Behind the Code: The Python Always-In Filter Engine

When we ran this raw model on intraday 15-minute Bitcoin data, the algorithm suffered a devastating $-13.14R$ drawdown with a horrific $20.93\%$ win rate. The asset's natural intraday choppiness kept trapping the engine into false range expansions.

To salvage the model, we engineered a structural regime filter: the 200 Exponential Moving Average (EMA). The rule was upgraded: the algorithm can only flip to Long if the price is trading above the 200 EMA, and can only flip to Short if it is trading below the 200 EMA. This prevents the system from buying the top of a bearish relief rally or shorting the bottom of a bullish pullback.

Here is the precise, production-grade Python definition for the filtered state engine:

```python
# Upgraded Al Brooks Always-In State Engine + 200 EMA Filter
def calculate_filtered_always_in(df, lookback=10, ema_period=200):
    df['Bar_Body'] = (df['Close'] - df['Open']).abs()
    df['Total_Range'] = df['High'] - df['Low']

    # 200 EMA Trend Filter Implementation
    df['EMA_200'] = df['Close'].ewm(span=ema_period, adjust=False).mean()

    # Check bar strength (Close must be in the top/bottom 25% of the bar)
    df['Bull_Strong'] = (
        (df['Close'] > df['Open'])
        & (df['Close'] >= df['High'] - df['Total_Range'] * 0.25)
    )
    df['Bear_Strong'] = (
        (df['Close'] < df['Open'])
        & (df['Close'] <= df['Low'] + df['Total_Range'] * 0.25)
    )

    # Tracking rolling structural boundaries
    df['Prev_Max_High'] = df['High'].rolling(window=lookback).max().shift(1)
    df['Prev_Min_Low'] = df['Low'].rolling(window=lookback).min().shift(1)

    ai_direction = np.zeros(len(df))
    current_state = 1  # Base state orientation

    for i in range(1, len(df)):
        consecutive_bulls = df['Bull_Strong'].iloc[i] and df['Bull_Strong'].iloc[i - 1]
        consecutive_bears = df['Bear_Strong'].iloc[i] and df['Bear_Strong'].iloc[i - 1]
        current_close = df['Close'].iloc[i]
        current_ema = df['EMA_200'].iloc[i]

        # Rule A: Flip to Always-In Long (Strictly ABOVE 200 EMA)
        if current_state == -1:
            if (
                consecutive_bulls
                and (current_close > df['Prev_Max_High'].iloc[i])
                and (current_close > current_ema)
            ):
                current_state = 1

        # Rule B: Flip to Always-In Short (Strictly BELOW 200 EMA)
        elif current_state == 1:
            if (
                consecutive_bears
                and (current_close < df['Prev_Min_Low'].iloc[i])
                and (current_close < current_ema)
            ):
                current_state = -1

        ai_direction[i] = current_state

    df['AI_State'] = ai_direction
    return df
```

## Cross-Asset Benchmarking: Crypto vs. S&P 500

Instead of relying on a single asset class, we ran this exact 200 EMA filtered engine across a 1-month 15-minute chart of Bitcoin (BTC-USD) and a 5-year daily chart of Al Brooks' absolute home ground: the S&P 500 Index (^GSPC).

The contrast in the hard data provides an incredible look into macro market mechanics:

| Performance Indicator | BTC-USD (15m Intraday Noise) | S&P 500 Index (Daily Home Ground) | Quantitative Insight |
| --- | --- | --- | --- |
| Total Simulated Flips | 18 | 11 | Strict mathematical filtering prevents overtrading on both assets. |
| Win Rate | 27.78% | 36.36% | S&P 500 prints a 31% higher accuracy rate than crypto noise. |
| Net Return (R-Units) | -2.95R | -0.92R | Equities reach near-break-even equilibrium without optimization. |

## The Post-Mortem: Why "Always-In" Requires Institutional Order Flow

The data reveals a stark reality: Al Brooks' framework performs vastly better on the S&P 500 than on crypto. Here is the mechanical breakdown of why this happens:

1. The Home Ground Effect (Smooth Institutional Trends)

Al Brooks engineered his strategy around major index equity futures. The S&P 500 is heavily regulated, massive in liquidity, and controlled by macro institutional portfolios that accumulate positions smoothly over days and weeks. When a breakout happens on the S&P 500 daily chart, it generally has real fund-driven momentum behind it.

Crypto, on the other hand, is driven by hyper-reactive retail traders, massive leverage liquidations, and aggressive algorithmic stop-hunts, making bar-by-bar trend continuation highly unstable on lower timeframes.

2. The Confirmation Lag (Buying the Local Top)

Even on the S&P 500, a pure, unoptimized mechanical execution yields a slightly negative expectancy ($-0.92R$). Why? Because waiting for two consecutive strong trend bars to break a 10-period high introduces a structural lag. By the time the code confirms the institutional direction, a large portion of the micro-expansion move is already complete. You end up risking more to capture the tail end of the move.

## The Quantitative Takeaway

Our cross-asset backtest confirms that treating trading concepts like religious dogmas is a dangerous game. Just because a legendary trader wrote a concept inside a textbook does not mean it prints money mechanically on every asset class, timeframe, or volatility regime.

If you are going to use Al Brooks' Always-In methodology:

- Restrict it to major equity indices like the S&P 500 or Nasdaq on higher timeframes where genuine macroeconomic trends exist.
- Avoid mechanical trend-flipping inside choppy crypto markets, where mean-reversion setups like the high-volume liquidity sweep traps we covered in our last backtest post hold a far superior mathematical edge.
- Systematic filtering saves trading accounts. Code your rules, verify them with cross-asset data, and let the numbers guide your risk.

What asset class do you trade using price action? Have you noticed the stark difference in trend continuation between equities and crypto? Let's discuss in the emails or GitHub.