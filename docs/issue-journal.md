# Issue çalışma günlüğü

Ajan yürütmesi başladığında ilgili issue üzerinde GitHub Actions botunun bir çalışma yorumu oluşturulur. Aynı çalışmanın adımları bu yoruma eklenir; farklı workflow run/attempt için ayrı yorum açılarak geçmiş denemeler korunur.

Kaydedilenler:

- Türkiye saatiyle adım zamanları
- Actions çalışma bağlantısı ve deneme numarası
- Başlangıç commit'i, görev dalı ve çıktı dosyası
- Kaynak dosyalar ve SHA-256 kaynak parmak izi
- Görevin alınması ve pano/etiket durumları
- Model çağrısına başlama veya kaydedilmiş belgeden AI çağrısı olmadan devam etme
- Markdown boyut/biçim ve kaynak bağlantısı kontrollerinin sonucu
- Belgenin dala kaydedilmesi ve PR bağlantısı
- Geçici hata sonrası kurtarma girişimi, son durum veya hata nedeni

Bu açıklamalar modelin ürettiği serbest durum iddiaları değil, uygulamanın tamamladığı adımlardan oluşturulan kayıtlardır. Model muhakemesi, prompt, kaynak içeriklerinin tamamı, API anahtarları ve ham HTTP cevapları yorumlara yazılmaz.

Her test sonucu issue'ya kopyalanmaz; yalnızca gerçekten yapılan belge kontrolleri kaydedilir. Ayrıntılı build/test çıktıları bağlantılı Actions logunda kalır. CI loglarının saklama süresi GitHub ayarlarına bağlıdır. Issue yorumları da silinebilir/değiştirilebilir; bu kayıt değiştirilemez bir denetim arşivi değildir.

Yorum oluşturmanın yanıtı kaybolursa sonraki güncelleme aynı çalışma işaretli bot yorumunu arar. İnsan yorumları düzenlenmez. Yorum erişimi geçici olarak başarısızsa görev durdurulmaz; Actions loguna uyarı yazılır, sonraki adım bütün birikmiş kayıtları yeniden göndermeyi dener. Süreç tamamen kesilirse kaydedilmemiş son adımlar kaybolabilir.

Intake aşamasında uygun bulunmayan her periyodik kontrol issue'ya yorum atmaz. Ajan yürütmesine geçmeden oluşan hatalar Actions üzerinde görünür. Eski çalışmaların eksik kayıtları sonradan tamamlanmış gibi gösterilmez.
