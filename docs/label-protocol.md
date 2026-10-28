# Etiket protokolü

## Görev alma koşulu

Issue hem yapılandırılmış GitHub Projects panosunda `Status = Ready` olmalı hem de insanın eklediği `Agent::Allowed` etiketini taşımalıdır. Yalnızca Ready veya yalnızca Allowed yeterli değildir. Backlog'daki görev alınmaz. Pano üyeliği/durumu okunamıyorsa görev alınmaz.

Ready kontrolü işe başlamadan yapılır. AI çağrısından önce kart In progress durumuna, PR açılınca In review durumuna taşınır. Çalışırken kartın In progress kaldığı ve issue etiketleri yayımlama öncesinde tekrar kontrol edilir. Takılınca kart yerinde kalır, Needs-Human etiketi ve neden yorumu eklenir. Yeniden deneme için insan kartı Ready durumuna getirip Allowed ekler. Done geçişi henüz otomatik değildir.

## Issue durumları

| Etiket | Sahibi | Anlamı |
| --- | --- | --- |
| `Agent::Allowed` | İnsan | Görevi ajana açar. |
| `Agent::Working` | Ajan | Görev üzerinde çalışılıyor. |
| `Agent::Needs-Human` | Ajan | Gerekçe ve gereken karar yorumda açıklanır. |
| `Agent::In-Review` | Ajan | PR açıldı, inceleme bekleniyor. |
| `Agent::Rejected` | İnsan | Otomatik yeniden deneme engellenir. |

Normal akış: Allowed → Working → In-Review. Takılma durumunda Working → Needs-Human. İnsan yanıtından sonra Allowed eklenmesi devam ettirme sinyalidir.

Rejected diğer etiketlerden önceliklidir; kaldırılmadan görev alınmaz. Ajan Rejected etiketini kaldırmaz. Yeni duruma geçerken önceki durum etiketleri temizlenir.

Aynı issue için ikinci aktif çalışma veya PR oluşturulmaz. Kesilmiş Working görevleri yalnızca açık resume_working seçimiyle kurtarılabilir; [recovery kuralları](recovery.md) geçerlidir. PR açmak görevi tamamlanmış saymaz; merge insana aittir.

## PR sonuçları

İnsan değerlendirme tamamlandığında PR üzerine tek sonuç etiketi ekler. İlk sürümde isteğe bağlıdır.

- `Agent-Result::Accepted-First-Try`
- `Agent-Result::Accepted-After-Revisions`
- `Agent-Result::Rejected-Wrong-Approach`
- `Agent-Result::Rejected-Out-Of-Scope`
- `Agent-Result::Rejected-Quality`

Sonuç etiketleri tek başına merge veya yeniden çalışma tetiklemez.
