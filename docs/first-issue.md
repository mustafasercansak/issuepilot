# İlk pilot: repo envanteri

GitHub'da **New issue → Repo envanteri** şablonu kullanılır.
İlk deneme bu küçük repoda yapılabilir. Gerçek bir hedef repodaki daha büyük envanter sonraki denemedir.

1. Görev metnini ve kabul kriterlerini incele.
2. Hazır olduğunda `Agent::Allowed` etiketini ekle.
3. Entegrasyon uygulandıktan sonra ajan `Working` durumuna geçer.
4. Ajan dosya referanslı analiz yorumunu, belge değişikliğini ve doğrulama sonuçlarını üretir.
5. PR açılınca issue `In-Review` durumuna geçer.
6. İnsan belgeyi inceler ve PR'a uygun `Agent-Result::` etiketini ekler.

Allowed etiketi şu anda yalnızca salt okunur Issue intake kontrolünü tetikler. Working, AI ile envanter üretme ve PR açma adımları henüz uygulanmadı.
