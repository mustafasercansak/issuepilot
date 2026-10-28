# AI envanter iş akışı

İlk sağlayıcı Gemini API; varsayılan model `gemini-3.1-flash-lite`.

## Kurulum

1. Google AI Studio'da ücretsiz katmandaki bir proje için API anahtarı oluştur: https://aistudio.google.com/api-keys
2. Ücretsiz kullanım hedefi için billing bağlamayın. Ücretsiz kota proje/model bazındadır; kullanılabilir kota AI Studio'dan kontrol edilir. Kod hesabın billing durumunu tespit edemez. Ücretli projeye ait anahtar kullanılırsa ücret çıkabilir.
3. GitHub **Settings → Secrets and variables → Actions → New repository secret** üzerinden `GEMINI_API_KEY` ekle. Anahtarı issue veya sohbette paylaşma.
4. Repository variable `INVENTORY_ISSUE_NUMBER=1` hedef görevi seçer. `GEMINI_MODEL` isteğe bağlıdır.
5. Hazır olduğunda repository variable `INVENTORY_AI_ENABLED=true` yap. Başlangıçta false tutulur.
6. Issue #1 üzerinde Allowed etiketini yeniden ekle veya **Actions → Issue intake → Run workflow** ile issue numarasını gir.

GitHub Actions token'ı repo içindeki işlerde kullanılır. Workflow job'ı `contents: write`, `issues: write`, `pull-requests: write` ister. Repo Actions ayarlarında PR oluşturmaya izin verilmelidir.

Ücretsiz API katmanında gönderilen içerik Google'ın ürün geliştirmesinde kullanılabilir. Gizli/proprietary kod göndermeden önce sağlayıcı koşullarını değerlendirin. Bu repo şu anda private olduğundan yalnızca uygun bulduğunuz kaynaklarla deneme yapın.

## Uygulanan akış

Allowed → uygunluk kontrolü → Working → takip edilen kaynaklardan sınırlı bağlam → tek Gemini isteği → belge boyutu/biçimi/kaynak bağlantısı kontrolü → issuepilot/inventory-N dalı → yalnızca docs/repository-inventory.md dosyası → PR → In-Review.

Workflow yalnızca yapılandırılmış tek envanter issue'sunu işler. Genel amaçlı kod ajanı değildir; issue metninden shell komutu çalıştırmaz. Modelin tool/komut yetkisi yoktur. Envanterin kapsamı sabittir; issue içindeki ek istekler modele uygulanmaz.

Bir istekte en fazla 8192 çıktı token'ı; bağlamda yaklaşık 100 KB kaynak; API bekleme süresi 120 saniyedir. Kota hatasında ücretli fallback veya otomatik tekrar yoktur. Çıkış tamamlanmamışsa PR açılmaz.

Hata sonrasında Needs-Human ve açıklama yorumu eklenir. Rejected, yayımlamadan önce tekrar kontrol edilir ve korunur. Çalışma sırasında eklenen ret etiketini ajan kaldırmaz. GitHub etiket/PR işlemleri atomik değildir; son kontrol ile yazma arasında kısa bir yarış aralığı kalır.

Aynı issue'nun workflow concurrency grubu eşzamanlı çalışmayı sınırlar. Bu kilit yalnızca bu workflow üzerinden başlatılan işler içindir. Önceden açılmış PR (kapalı dahil) veya kalan dal üzerine otomatik yazılmaz. PR sonrasında revizyon ve mevcut belgeyi yenileme henüz desteklenmez. Kesilmiş Working işi insan tarafından incelenip gerekiyorsa etiket ve dal temizlenerek yeniden Allowed yapılmalıdır.

## Sınırlar ve doğrulama

Sadece takip edilen, desteklenen türlerdeki, boyut sınırındaki normal dosyalar gönderilir. Bilinen credential adları, .env, symlink, lockfile ve üretilen dosyalar dışarıda bırakılır. Bu genel bir secret tarayıcısı değildir; kaynak içine gömülmüş sırrı bulmayı garanti etmez.

Biçim ve kaynak bağlantısı kontrolleri olgusal doğruluğu kanıtlamaz. İnsan incelemesi zorunludur. Model komut çalıştırmadığı için envanter statik analizi açıkça belirtmelidir. Otomatik merge yoktur.

## Daha fazla ücretsiz kullanım

Yerel Ollama için sağlayıcı adaptörü ve self-hosted runner sonraki seçenek olabilir. Yerel çalışmada API kotası olmaz; kapasite makinenin RAM/GPU ve işlem süresine bağlıdır. Elektrik ve donanım maliyeti devam eder. Ollama adaptörü henüz uygulanmadı.

## Kaynaklar

- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/rate-limits
- https://ai.google.dev/api/generate-content
- https://docs.ollama.com/faq

İlk gerçek API denemesinde Gemini yanıt verdi, ancak kaynak bağlantısı doğrulaması nedeniyle PR açılmadı. Bilinen kaynaklara ait repo-kökü bağlantılarını doğru göreli yola dönüştürme ve prompt'a açık bağlantı haritası ekleme uygulanmıştır. Bilinmeyen kaynaklar hâlâ reddedilir.
