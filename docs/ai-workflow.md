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

Ücretsiz API katmanında gönderilen içerik Google'ın ürün geliştirmesinde kullanılabilir. Gizli/proprietary kod göndermeden önce sağlayıcı koşullarını değerlendirin. IssuePilot reposu public yapılmıştır; private hedeflerde yalnızca sağlayıcıya göndermeyi uygun bulduğunuz kaynaklarla deneme yapın.

## Uygulanan akış

Ready + Allowed → uygunluk kontrolü → pano In progress + Working → takip edilen kaynaklardan sınırlı bağlam → tek Gemini isteği → belge boyutu/biçimi/kaynak bağlantısı kontrolü → issuepilot/inventory-N dalı → yalnızca göreve ait Markdown dosyası → PR → pano In review + In-Review.

Workflow yalnızca yapılandırılmış tek envanter issue'sunu işler. Genel amaçlı kod ajanı değildir; issue metninden shell komutu çalıştırmaz. Modelin tool/komut yetkisi yoktur. Envanterin kapsamı sabittir; issue içindeki ek istekler modele uygulanmaz.

Bir istekte en fazla 8192 çıktı token'ı; bağlamda yaklaşık 100 KB kaynak; API bekleme süresi 120 saniyedir. Kota hatasında ücretli fallback veya otomatik tekrar yoktur. Çıkış tamamlanmamışsa PR açılmaz.

Hata sonrasında Needs-Human ve açıklama yorumu eklenir. Rejected, yayımlamadan önce tekrar kontrol edilir ve korunur. Çalışma sırasında eklenen ret etiketini ajan kaldırmaz. GitHub etiket/PR işlemleri atomik değildir; son kontrol ile yazma arasında kısa bir yarış aralığı kalır.

Aynı issue'nun workflow concurrency grubu eşzamanlı çalışmayı sınırlar. Bu kilit yalnızca bu workflow üzerinden başlatılan işler içindir. Hata sonrası devam etme ve kesilmiş Working görevinin kurtarılması [recovery](recovery.md) belgesinde açıklanır. Kapalı PR yeniden açılmaz ve replacement PR üretilmez. PR içeriğine review revizyonları uygulama henüz desteklenmez.

İlk görev #1 için çıktı docs/repository-inventory.md olarak korunur. Sonraki görevler docs/technical-summary-N.md üretir; farklı issue'lar aynı dosyanın üzerine yazmaz. Yeni görev için INVENTORY_ISSUE_NUMBER değişkenini ayarlayın. Bu hâlâ yapılandırılmış tek pilotu işler; tüm Ready issue'larını tüketen genel kuyruk değildir.

## İkinci model ile bağımsız denetim (isteğe bağlı)

`INVENTORY_REVIEW_ENABLED=true` olduğunda belgeyi üreten Gemini'den sonra ikinci bir sağlayıcı (Mistral, varsayılan `mistral-small-latest`) belgeyi kaynak dosyalarla karşılaştırır ve kaynakların desteklemediği ifadeleri listeler. Denetçi yalnızca engelleyebilir: hiçbir şeyi düzenlemez, önerisi belgeye eklenmez.

- Bulgu varsa belge dala kaydedilmez, PR açılmaz, görev `Agent::Needs-Human` olur. Bulgu metinleri (en fazla 10, her biri 200 karaktere kısaltılmış) yalnızca workflow logunda görünür; issue günlüğünde yalnızca sayı yazılır.
- Denetçi cevabı geçerli bir JSON karar değilse veya tutarsızsa görev yine durur (fail closed). İstek hatalarında otomatik yeniden deneme yoktur.
- `MISTRAL_API_KEY` secret'ı eksikse görev, Gemini kotası harcanmadan önce durur.
- Denetim temiz çıkarsa PR açıklamasına bir not eklenir. Bu not doğruluğun kanıtı değildir; insan incelemesi yine zorunludur.
- Denetim yalnızca belge görevlerinde (`summary`, `readme-setup`) çalışır. Kod düzeltmesi görevinde uygulanmaz. Kaydedilmiş bir kontrol noktası yeniden kullanılırken tekrar çalıştırılmaz.

Kurulum: GitHub Secret `MISTRAL_API_KEY`; Variable `INVENTORY_REVIEW_ENABLED=true`; isteğe bağlı Variable `MISTRAL_MODEL`. Anahtarı issue veya sohbette paylaşma.

**Doğrulama durumu:** Mistral uç noktası ve istek biçimi resmi API dokümanına göre yazıldı, ama bu entegrasyon gerçek bir Mistral anahtarıyla denenmedi; testler sahte yanıtlarla çalışır. Ücretsiz katmanın güncel kotası ve koşulları kaynaklarda tutarsız ve yayımlanmış sayılara güvenilmemeli; kotayı Mistral konsolundan kontrol edin. Ücretsiz katman için yayımlanan bilgilere göre kullanım verisi model eğitiminde kullanılabilir olabilir; gizli kod göndermeden önce sağlayıcı koşullarını değerlendirin.

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

Pilot sadeleştirildi: yalnızca README.md, package.json ve .github/workflows/ci.yml kaynak alınarak 5–8 maddelik kısa özet üretilir. Bu ilk deneme tam repo envanteri değildir.

Görev almak için [Ready kapısının](ready-gate.md) PROJECT_TOKEN yapılandırması da gereklidir. Token yoksa AI çağrısı yapılmaz.

Pano durumunu güncellemek için PROJECT_TOKEN classic PAT üzerinde `project` yazma yetkisi gerekir. Salt `read:project` yeterli değildir. Çalışma sırasında beklenen pano durumu artık In progress durumudur. Public repo için private repo erişim yetkisi gerekmez.

Ajanın işlem adımları her çalışma için ilgili issue yorumunda tutulur: [çalışma günlüğü](issue-journal.md). Ayrıntılı test/komut çıktıları Actions bağlantısında kalır.

README düzenleme desteği: INVENTORY_TASK_KIND=readme-setup seçilirse yalnızca README.md sonuna doğrulanmış kurulum bölümü eklenir. summary varsayılan teknik özet tipidir. [Görev kapsamı](readme-task.md).

Kontrollü ilk kod düzeltmesi: INVENTORY_TASK_KIND=cli-repository. Model sadece repo adı regex verisini üretir; uygulama CLI ifadesini ve sabit regresyon testini iki dosyalı commit olarak hazırlar. [Kapsam ve sınırlar](cli-repository-task.md).
