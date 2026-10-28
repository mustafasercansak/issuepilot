# Ready kapısı

Görev alma kuralı: yapılandırılmış panoda **Status = Ready** ve issue üzerinde **Agent::Allowed**.

## Yapılandırma

- `PROJECT_ID`: hedef GitHub Project node ID. Bu repo için `PVT_kwHOAr3aNM4BpEZa` (mustafasercansak / project 7).
- `PROJECT_TOKEN`: Actions repository secret. Kişisel Projects panosunu ve private issue içeriğini okuyabilmelidir. Classic PAT için `project` (okuma/yazma) ve private repo içeriği için `repo` kapsamları gerekir. Repo public olduğunda private repo yetkisi gerekmez. Mümkünse kısa süreli ve ihtiyaca göre daraltılmış bir token kullanın. İş akışı pano durumunu okur ve günceller.
- `PROJECT_POLLING_ENABLED=true`: Ready değişimini yakalamak için 30 dakikalık kontrolü açar. Token eklenene kadar false tutulur.
- `INVENTORY_ISSUE_NUMBER`: ilk pilotun işleyeceği tek issue. Tüm Ready görevlerini işleyen genel kuyruk henüz yoktur.

GitHub'ın repository `GITHUB_TOKEN`'ı kişisel Projects panosuna yeterli erişimi vermez. Mevcut gh oturum anahtarı secret olarak kopyalanmaz. Yeni token GitHub Settings → Developer settings → Personal access tokens bölümünden oluşturulup repo Actions secret'ına eklenmelidir.

## Çalışma

Allowed eklendiğinde ve manuel çalıştırmada durum hemen kontrol edilir. Pano sütunu değişimi issue label olayı değildir; yalnızca Ready'ye taşıma bu nedenle periyodik kontrolde algılanır. GitHub schedule çalışmaları gecikebilir. Private repoda tarama Actions dakikası tüketir; 30 dakika aralığı dahil kota tüketimini azaltmak için seçildi, tam ücretsiz çalışma garantisi değildir.

Pano kontrolü CLI intake ve AI runner içinde uygulanır. Yetki veya GraphQL hatasında AI çağrısı ve PR yazımı yapılmaz. Pano sayfaları cursor ile gezilir; hedef issue başka projede Ready olsa bile seçilen panonun durumu belirleyicidir.

Ready'den alınan görevler AI çağrısından önce In progress, PR açıldıktan sonra In review yapılır. Pano yazımı başarısızsa model çağrısı başlatılmaz. Çalışırken kart In progress dışında bir duruma taşınırsa yayımlama durur. Takılan görev yerinde kalır; Needs-Human etiketi ve açıklama yorumu eklenir. Retry için kartı Ready yapıp Allowed ekleyin. Done otomasyonu henüz yoktur.

Kesilmiş Working işi için manuel workflow başlatırken resume_working=true seçilebilir. Bu istisna Ready yerine In progress/In review durumunu kabul eder; Rejected veya kapalı issue için geçerli değildir. Detaylar: [recovery](recovery.md).
