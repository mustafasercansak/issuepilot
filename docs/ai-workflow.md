# AI envanter iş akışı

## Hedef akış

1. İnsan mevcut GitHub issue'suna `Agent::Allowed` ekler.
2. Issue intake etiketleri tekrar okur; kapalı/reddedilmiş/çalışılan/incelemedeki işleri engeller.
3. Envanter görevi için ayrı iş akışı kaynak dosyaları toplar.
4. Seçilen AI sağlayıcısına sınırlı kaynak içeriği gönderilir.
5. Markdown çıktı doğrulanır ve yalnızca `docs/repository-inventory.md` yazılır.
6. Göreve ait ayrı dalda commit ve issue bağlantılı PR oluşturulur.
7. Issue `Agent::In-Review` durumuna geçer. Merge insandadır.

Bu ilk görev genel amaçlı kod çalıştıran bir ajan değildir. Issue metni komut olarak çalıştırılmaz. AI yalnızca envanter belgesini üretir. GitHub işlemlerini belirlenmiş uygulama kodu yapar.

## Şu anda uygulananlar

- GitHub issue okuma ve uygunluk kontrolü.
- Etiket olayından salt okunur GitHub Actions kontrolü.
- Takip edilen dosyalardan boyutu sınırlı envanter bağlamı toplama.
- Bilinen credential dosya adlarını, .env dosyalarını, symlink ve üretilen dosyaları hariç tutma.
- Dosyaları talimat yerine veri olarak sunan envanter prompt'u.

Kaynak toplama, genel bir secret tarayıcısı değildir. Kaynak kod içerisine gömülmüş bir sırın bulunmayacağını garanti etmez. Sağlayıcıya gönderilecek kaynaklar yapılandırılabilir ve belgelenmelidir.

## Henüz uygulanmayanlar

AI HTTP çağrısı, belge çıktısı doğrulama, Working/In-Review geçişleri, dal push ve PR açma. Sağlayıcı ve model seçildikten sonra bağlanacak.

## GitHub yapılandırması

AI sağlayıcısının anahtarı **Settings → Secrets and variables → Actions** üzerinden eklenir. Anahtar sohbet, issue veya kaynak dosyasında paylaşılmaz. Model adı repository variable olarak tutulabilir.

AI anahtarı seçilen sağlayıcıya erişim içindir; `GITHUB_TOKEN` ise bu repodaki issue/dal/PR işlemleri içindir. Birbirinin yerine geçmezler.

PR oluşturan workflow için `contents: write`, `issues: write` ve `pull-requests: write` izinleri gerekir. Repo ayarlarında GitHub Actions'ın PR oluşturmasına izin verilmesi gerekebilir. Mevcut salt okunur workflow bu yazma izinlerini henüz kullanmaz.

Kesilme, eşzamanlı tekrar çalışma, yeniden tetikleme ve mevcut PR kontrolü uygulanmadan otomatik görev sahiplenme etkinleştirilmez.
